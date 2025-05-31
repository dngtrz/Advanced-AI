import { Client, GatewayIntentBits, Events, Partials } from 'discord.js';
import { handleMessage } from './handler';
import { storage } from '../storage';
import { registerSlashCommands, handleSlashCommand } from './slashCommands';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// Event handlers
client.once(Events.ClientReady, async (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
  await registerSlashCommands(c);
  
  // Update bot stats
  await storage.updateBotStats({
    totalServers: c.guilds.cache.size,
    uptime: 0
  });
});

// Handle slash commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  await handleSlashCommand(interaction);
});

// Handle regular messages
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  
  try {
    let settings = await storage.getSettingsByGuildId(message.guild?.id || 'DM');
    
    // Create default settings if needed
    if (!settings) {
      settings = await storage.createOrUpdateSettings({
        guildId: message.guild?.id || 'DM',
        prefix: '',
        responseLength: 'medium',
        personality: 'helpful',
        codeFormat: true,
        allowedChannels: [],
        channelMode: 'all',
        slashCommandMode: 'disabled',
        activatedChannels: []
      });
    }

    // Check channel restrictions
    if (settings.channelMode === 'specific' && settings.allowedChannels && settings.allowedChannels.length > 0) {
      if (!settings.allowedChannels.includes(message.channel.id)) {
        return;
      }
    }

    // Check slash command mode
    if (settings.slashCommandMode === 'required') {
      return; // Only respond to slash commands
    }

    // Check if channel is activated (new mode)
    if (settings.slashCommandMode === 'activated') {
      const activatedChannels = settings.activatedChannels || [];
      if (!activatedChannels.includes(message.channel.id)) {
        return; // Only respond in activated channels
      }
    }

    await handleMessage(message, '');
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

// Handle guild join/leave events for stats
client.on(Events.GuildCreate, async (guild) => {
  await storage.updateBotStats({
    totalServers: client.guilds.cache.size
  });
});

client.on(Events.GuildDelete, async (guild) => {
  await storage.updateBotStats({
    totalServers: client.guilds.cache.size
  });
});

export async function startBot() {
  if (!process.env.DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN environment variable is required');
  }
  
  if (client.isReady()) {
    return;
  }
  
  await client.login(process.env.DISCORD_TOKEN);
  console.log('Discord bot is now online!');
}

export async function stopBot() {
  if (client.isReady()) {
    client.destroy();
  }
}

export function getStatus() {
  const isRunning = client.isReady();
  return {
    isRunning,
    guilds: isRunning ? client.guilds.cache.size : 0,
    username: isRunning ? client.user?.username || null : null,
    uptime: isRunning ? client.uptime : null,
  };
}
