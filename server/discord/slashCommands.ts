import { SlashCommandBuilder, ChatInputCommandInteraction, Client } from 'discord.js';
import { generateAIResponse } from '../openai/client';
import { storage } from '../storage';

export const slashCommands = [
  new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Ask the AI assistant a question')
    .addStringOption(option =>
      option.setName('prompt')
        .setDescription('Your question or prompt for the AI')
        .setRequired(true)
    )
    .toJSON(),
  
  new SlashCommandBuilder()
    .setName('aimode')
    .setDescription('Configure AI response mode for this server')
    .addStringOption(option =>
      option.setName('mode')
        .setDescription('Response mode')
        .setRequired(true)
        .addChoices(
          { name: 'Always respond to all messages', value: 'disabled' },
          { name: 'Respond to both messages and slash commands', value: 'enabled' },
          { name: 'Only respond to slash commands', value: 'required' }
        )
    )
    .toJSON()
];

export async function handleSlashCommand(interaction: ChatInputCommandInteraction) {
  try {
    if (interaction.commandName === 'ai') {
      await handleAICommand(interaction);
    } else if (interaction.commandName === 'aimode') {
      await handleAIModeCommand(interaction);
    }
  } catch (error) {
    console.error('Error handling slash command:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply('Sorry, I encountered an error while processing your command.');
    }
  }
}

async function handleAICommand(interaction: ChatInputCommandInteraction) {
  const prompt = interaction.options.getString('prompt', true);
  
  await interaction.deferReply();
  
  try {
    // Get or create user
    let user = await storage.getUserByDiscordId(interaction.user.id);
    if (!user) {
      user = await storage.createUser({
        discordId: interaction.user.id,
        username: interaction.user.username,
      });
    }

    // Get or create conversation
    let conversation = await storage.getConversationByChannelAndUser(
      interaction.channel?.id || 'DM',
      interaction.user.id
    );

    if (!conversation) {
      conversation = await storage.createConversation({
        userId: interaction.user.id,
        channelId: interaction.channel?.id || 'DM',
        guildId: interaction.guild?.id || null,
      });
    }

    // Store user message
    await storage.createMessage({
      conversationId: conversation.id,
      content: prompt,
      role: 'user',
    });

    // Get conversation context
    const recentMessages = await storage.getMessagesByConversation(conversation.id);
    const contextMessages = recentMessages.slice(-10);

    const guildId = interaction.guild?.id || 'DM';
    const settings = await storage.getSettingsByGuildId(guildId);
    
    const response = await generateAIResponse(
      prompt,
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
    
    if (response.length <= 1900) {
      await interaction.editReply(response);
    } else {
      const chunks = splitMessage(response);
      await interaction.editReply(chunks[0]);
      
      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp(chunks[i]);
      }
    }

    // Update stats
    await storage.updateBotStats({
      totalMessages: (await storage.getBotStats())?.totalMessages ?? 0 + 1,
      apiCalls: (await storage.getBotStats())?.apiCalls ?? 0 + 1,
    });

  } catch (error) {
    console.error('Error generating AI response:', error);
    await interaction.editReply('Sorry, I encountered an error while generating a response.');
  }
}

async function handleAIModeCommand(interaction: ChatInputCommandInteraction) {
  const mode = interaction.options.getString('mode', true) as 'disabled' | 'enabled' | 'required';
  
  try {
    const guildId = interaction.guild?.id || 'DM';
    let settings = await storage.getSettingsByGuildId(guildId);
    
    if (!settings) {
      settings = await storage.createOrUpdateSettings({
        guildId,
        prefix: '',
        responseLength: 'medium',
        personality: 'helpful',
        codeFormat: true,
        allowedChannels: [],
        channelMode: 'all',
        slashCommandMode: mode
      });
    } else {
      settings = await storage.createOrUpdateSettings({
        ...settings,
        slashCommandMode: mode
      });
    }
    
    let modeDescription: string;
    switch (mode) {
      case 'disabled':
        modeDescription = 'The bot will respond to all messages normally (no slash command required)';
        break;
      case 'enabled':
        modeDescription = 'The bot will respond to both regular messages and slash commands';
        break;
      case 'required':
        modeDescription = 'The bot will ONLY respond when summoned via /ai command';
        break;
    }
    
    await interaction.reply({
      content: `✅ AI mode updated!\n\n**${modeDescription}**\n\nUse \`/ai [your prompt]\` to interact with the AI assistant.`,
      ephemeral: true
    });
  } catch (error) {
    console.error('Error updating AI mode:', error);
    await interaction.reply({
      content: 'Sorry, I encountered an error while updating the AI mode.',
      ephemeral: true
    });
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

export async function registerSlashCommands(client: Client) {
  if (!client.user) return;
  
  try {
    console.log('Registering slash commands...');
    
    await client.application?.commands.set(slashCommands);
    
    const guilds = Array.from(client.guilds.cache.values());
    for (const guild of guilds) {
      try {
        await guild.commands.set(slashCommands);
        console.log(`Registered slash commands for guild: ${guild.name}`);
      } catch (guildError) {
        console.error(`Error registering commands for guild ${guild.name}:`, guildError);
      }
    }
    
    console.log('Successfully registered slash commands!');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
}
