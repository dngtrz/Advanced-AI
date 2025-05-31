import { 
  users, conversations, messages, settings, botStats,
  type User, type InsertUser,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type Settings, type InsertSettings,
  type BotStats, type InsertBotStats
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByDiscordId(discordId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Conversations
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationByChannelAndUser(channelId: string, userId: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getRecentConversations(limit?: number): Promise<(Conversation & { messages: Message[] })[]>;
  
  // Messages
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Settings
  getSettingsByGuildId(guildId: string): Promise<Settings | undefined>;
  createOrUpdateSettings(settings: InsertSettings): Promise<Settings>;
  
  // Bot Stats
  getBotStats(): Promise<BotStats | undefined>;
  updateBotStats(stats: Partial<InsertBotStats>): Promise<BotStats>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.discordId, discordId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversationByChannelAndUser(channelId: string, userId: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.channelId, channelId), eq(conversations.userId, userId)))
      .orderBy(desc(conversations.createdAt))
      .limit(1);
    return conversation || undefined;
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async getRecentConversations(limit = 10): Promise<(Conversation & { messages: Message[] })[]> {
    const recentConversations = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.createdAt))
      .limit(limit);

    const conversationsWithMessages = await Promise.all(
      recentConversations.map(async (conversation) => {
        const conversationMessages = await this.getMessagesByConversation(conversation.id);
        return {
          ...conversation,
          messages: conversationMessages,
        };
      })
    );

    return conversationsWithMessages;
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getSettingsByGuildId(guildId: string): Promise<Settings | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.guildId, guildId));
    return setting || undefined;
  }

  async createOrUpdateSettings(insertSettings: InsertSettings): Promise<Settings> {
    const existingSettings = await this.getSettingsByGuildId(insertSettings.guildId);
    
    if (existingSettings) {
      const [updatedSettings] = await db
        .update(settings)
        .set({
          ...insertSettings,
          updatedAt: new Date(),
        })
        .where(eq(settings.guildId, insertSettings.guildId))
        .returning();
      return updatedSettings;
    } else {
      const [newSettings] = await db
        .insert(settings)
        .values(insertSettings)
        .returning();
      return newSettings;
    }
  }

  async getBotStats(): Promise<BotStats | undefined> {
    const [stats] = await db.select().from(botStats).orderBy(desc(botStats.lastUpdated)).limit(1);
    return stats || undefined;
  }

  async updateBotStats(statsUpdate: Partial<InsertBotStats>): Promise<BotStats> {
    const existingStats = await this.getBotStats();
    
    if (existingStats) {
      const [updatedStats] = await db
        .update(botStats)
        .set({
          ...statsUpdate,
          lastUpdated: new Date(),
        })
        .where(eq(botStats.id, existingStats.id))
        .returning();
      return updatedStats;
    } else {
      const [newStats] = await db
        .insert(botStats)
        .values({
          totalServers: 0,
          totalMessages: 0,
          activeConversations: 0,
          apiCalls: 0,
          uptime: 0,
          ...statsUpdate,
        })
        .returning();
      return newStats;
    }
  }
}

export const storage = new DatabaseStorage();
