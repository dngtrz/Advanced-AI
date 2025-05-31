import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { startBot, stopBot, getStatus } from "./discord/bot";
import { insertSettingsSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Bot control routes
  app.post("/api/bot/start", async (req, res) => {
    try {
      await startBot();
      res.json({ success: true, message: "Bot started successfully" });
    } catch (error) {
      console.error("Error starting bot:", error);
      res.status(500).json({ error: "Failed to start bot" });
    }
  });

  app.post("/api/bot/stop", async (req, res) => {
    try {
      await stopBot();
      res.json({ success: true, message: "Bot stopped successfully" });
    } catch (error) {
      console.error("Error stopping bot:", error);
      res.status(500).json({ error: "Failed to stop bot" });
    }
  });

  app.get("/api/bot/status", async (req, res) => {
    try {
      const status = getStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting bot status:", error);
      res.status(500).json({ error: "Failed to get bot status" });
    }
  });

  // Bot statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getBotStats();
      res.json(stats || {
        totalServers: 0,
        totalMessages: 0,
        activeConversations: 0,
        apiCalls: 0,
        uptime: 0
      });
    } catch (error) {
      console.error("Error getting stats:", error);
      res.status(500).json({ error: "Failed to get statistics" });
    }
  });

  // Settings routes
  app.get("/api/settings/:guildId", async (req, res) => {
    try {
      const { guildId } = req.params;
      const settings = await storage.getSettingsByGuildId(guildId);
      
      if (!settings) {
        return res.status(404).json({ error: "Settings not found for this server" });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error getting settings:", error);
      res.status(500).json({ error: "Failed to get settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const validatedSettings = insertSettingsSchema.parse(req.body);
      const settings = await storage.createOrUpdateSettings(validatedSettings);
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Conversations routes
  app.get("/api/conversations", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const conversations = await storage.getRecentConversations(limit);
      res.json(conversations);
    } catch (error) {
      console.error("Error getting conversations:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessagesByConversation(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error getting conversation messages:", error);
      res.status(500).json({ error: "Failed to get conversation messages" });
    }
  });

  // Start the bot automatically when the server starts
  if (process.env.DISCORD_TOKEN && process.env.OPENAI_API_KEY) {
    startBot().catch(console.error);
  }

  const httpServer = createServer(app);
  return httpServer;
}
