import { Message } from 'discord.js';
import { generateAIResponse } from '../openai/client';
import { storage } from '../storage';

export async function handleMessage(message: Message, prefix: string) {
  try {
    // Get or create user
    let user = await storage.getUserByDiscordId(message.author.id);
    if (!user) {
      user = await storage.createUser({
        discordId: message.author.id,
        username: message.author.username,
      });
    }

    // Get or create conversation
    let conversation = await storage.getConversationByChannelAndUser(
      message.channel.id,
      message.author.id
    );

    if (!conversation) {
      conversation = await storage.createConversation({
        userId: message.author.id,
        channelId: message.channel.id,
        guildId: message.guild?.id || null,
      });
    }

    // Store user message
    await storage.createMessage({
      conversationId: conversation.id,
      content: message.content,
      role: 'user',
    });

    // Get conversation context (last 10 messages)
    const recentMessages = await storage.getMessagesByConversation(conversation.id);
    const contextMessages = recentMessages.slice(-10);

    // Get server settings
    const settings = await storage.getSettingsByGuildId(message.guild?.id || 'DM');

    // Generate AI response
    const response = await generateAIResponse(
      message.content,
      contextMessages,
      settings?.personality,
      settings?.responseLength
    );

    // Store AI response
    await storage.createMessage({
      conversationId: conversation.id,
      content: response,
      role: 'assistant',
    });

    // Split long messages
    if (response.length <= 1900) {
      await message.reply(response);
    } else {
      const chunks = splitMessage(response);
      await message.reply(chunks[0]);
      
      for (let i = 1; i < chunks.length; i++) {
        await message.channel.send(chunks[i]);
      }
    }

    // Update stats
    await storage.updateBotStats({
      totalMessages: (await storage.getBotStats())?.totalMessages ?? 0 + 1,
      apiCalls: (await storage.getBotStats())?.apiCalls ?? 0 + 1,
    });

  } catch (error) {
    console.error('Error handling message:', error);
    await message.reply('Sorry, I encountered an error while processing your message. Please try again later.');
  }
}

function splitMessage(text: string, maxLength = 1900): string[] {
  if (text.length <= maxLength) return [text];
  
  const chunks: string[] = [];
  let currentChunk = '';
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > maxLength) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      
      if (line.length > maxLength) {
        let remainingLine = line;
        while (remainingLine.length > maxLength) {
          chunks.push(remainingLine.substring(0, maxLength));
          remainingLine = remainingLine.substring(maxLength);
        }
        currentChunk = remainingLine;
      } else {
        currentChunk = line;
      }
    } else {
      if (currentChunk.length > 0) {
        currentChunk += '\n' + line;
      } else {
        currentChunk = line;
      }
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
}
