
# Discord AI Assistant Bot - Complete Implementation Guide

## Overview
A Discord bot that integrates with OpenAI's GPT-4o to provide AI assistance in Discord servers. Features include slash commands, message responses, voice channel integration, conversation memory, and a web dashboard for management.

## Architecture

### Technology Stack
- **Backend**: Node.js, Express.js, TypeScript
- **Frontend**: React, Vite, Tailwind CSS
- **Database**: SQLite with Drizzle ORM
- **Discord**: discord.js v14, @discordjs/voice
- **AI**: OpenAI API (GPT-4o)
- **Deployment**: Replit (port 5000)

### Project Structure
```
├── server/
│   ├── discord/
│   │   ├── bot.ts          # Main bot client and event handlers
│   │   ├── handler.ts      # Message processing logic
│   │   └── slashCommands.ts # Slash command definitions and handlers
│   ├── openai/
│   │   └── client.ts       # OpenAI API integration
│   ├── db.ts              # Database schema and connection
│   ├── storage.ts         # Database operations
│   ├── routes.ts          # API endpoints
│   └── index.ts           # Express server setup
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   └── dashboard.tsx # Web dashboard interface
│   │   └── ...
└── shared/
    └── schema.ts          # Shared TypeScript schemas
```

## Environment Variables Required

```env
DISCORD_TOKEN=your_discord_bot_token
OPENAI_API_KEY=your_openai_api_key
```

## Database Schema

### Tables:
1. **users** - Discord user information
2. **conversations** - Chat conversations per channel/user
3. **messages** - Individual messages with conversation context
4. **settings** - Server-specific bot configuration
5. **bot_stats** - Usage statistics

### Key Fields:
- Users: discordId, username, createdAt
- Conversations: userId, channelId, guildId, createdAt
- Messages: conversationId, content, role (user/assistant), createdAt
- Settings: guildId, personality, responseLength, slashCommandMode, activatedChannels
- Stats: totalServers, totalMessages, apiCalls, uptime

## Discord Bot Features

### Slash Commands

#### `/ai [prompt]`
- Direct AI interaction command
- Maintains conversation context (last 10 messages)
- Handles long responses by splitting into chunks
- Stores conversation history

#### `/activate`
- Activates AI responses in current channel
- Sets channel-specific response mode
- Ephemeral response (only visible to command user)

#### `/deactivate`
- Deactivates AI responses in current channel
- Removes channel from activated channels list
- Ephemeral response

#### `/aimode [mode]`
- Configures server-wide AI response behavior
- Modes:
  - `disabled`: Respond to all messages (no slash command required)
  - `enabled`: Respond to both messages and slash commands
  - `required`: Only respond to /ai commands
  - `activated`: Only respond in activated channels

#### `/joinvoice`
- Joins user's current voice channel
- Maintains voice connection per guild
- Handles connection status events

#### `/leavevoice`
- Leaves current voice channel
- Cleans up voice connection resources

### Message Handling

#### Auto-Response Logic:
1. Check if message is from bot (ignore if true)
2. Get server settings or create defaults
3. Apply channel restrictions if configured
4. Check slash command mode requirements
5. Process message through AI if conditions met

#### Response Modes:
- **All messages**: Responds to every non-bot message
- **Slash only**: Only responds to /ai commands
- **Activated channels**: Only responds in channels activated with /activate
- **Channel restrictions**: Only responds in specified allowed channels

### AI Integration

#### OpenAI Configuration:
- Model: GPT-4o (latest available)
- Context: Last 10 conversation messages
- Customizable personality and response length
- Error handling for rate limits and API issues

#### Personality Options:
- **Friendly**: Warm, casual, uses emojis
- **Technical**: Precise, detailed, code-focused
- **Creative**: Imaginative, encourages exploration
- **Helpful** (default): Clear and informative

#### Response Length Options:
- **Concise**: 1-2 sentences, 500 max tokens
- **Medium** (default): Balanced responses, 1000 max tokens
- **Detailed**: Comprehensive explanations, 1500 max tokens

## Web Dashboard Features

### Real-time Status Display
- Bot online/offline status
- Connected server count
- Current username display
- Uptime tracking

### Statistics Dashboard
- Total servers connected
- Total messages processed
- API call count
- Active conversations

### Bot Control
- Start/Stop bot functionality
- Real-time status updates
- Environment variable validation display

### Server Configuration
- Per-server settings management
- Personality and response length configuration
- Channel activation management
- AI mode configuration

## API Endpoints

### Bot Control
- `POST /api/bot/start` - Start the Discord bot
- `POST /api/bot/stop` - Stop the Discord bot
- `GET /api/bot/status` - Get current bot status

### Statistics
- `GET /api/stats` - Get bot usage statistics

### Settings
- `GET /api/settings/:guildId` - Get server settings
- `POST /api/settings` - Update server settings

### Conversations
- `GET /api/conversations` - Get recent conversations
- `GET /api/conversations/:id/messages` - Get conversation messages

## Key Implementation Details

### Discord Bot Setup (bot.ts)
```typescript
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});
```

### Message Processing Flow
1. Receive Discord message event
2. Check bot message filter
3. Get/create user in database
4. Get/create conversation context
5. Store user message
6. Retrieve conversation history (last 10 messages)
7. Get server settings for AI configuration
8. Generate AI response with context
9. Store AI response
10. Send response (split if too long)
11. Update usage statistics

### Voice Channel Integration
- Uses @discordjs/voice for voice connections
- Maintains connection map per guild
- Handles connection status events
- Automatic cleanup on disconnect

### Error Handling
- Comprehensive try-catch blocks
- Specific error messages for rate limits
- Graceful degradation for API failures
- Logging for debugging

### Database Operations
- Drizzle ORM for type-safe queries
- Automatic user/conversation creation
- Conversation context management
- Settings with defaults
- Statistics tracking

## Security Considerations

### Token Management
- Environment variables for sensitive data
- No hardcoded API keys
- Secure token validation

### Input Validation
- Zod schemas for data validation
- SQL injection prevention via ORM
- Rate limiting considerations

### Permission Handling
- Ephemeral responses for configuration commands
- Server-specific settings isolation
- User permission validation

## Deployment Configuration

### Server Setup
- Express server on port 5000
- Host binding to 0.0.0.0 for external access
- Static file serving for React frontend
- API route registration

### Auto-start Configuration
- Bot starts automatically when server starts
- Environment variable validation
- Graceful error handling on startup

### Production Considerations
- SQLite database persistence
- File system write permissions
- Network connectivity requirements
- Memory usage optimization

## Customization Options

### Adding New Slash Commands
1. Add command definition to slashCommands array
2. Implement handler function
3. Add case in handleSlashCommand switch
4. Register command on bot ready

### Extending AI Personalities
1. Add new personality option to settings schema
2. Update switch statement in generateAI Response
3. Add UI option in dashboard
4. Update system prompt logic

### Adding New API Endpoints
1. Define route in routes.ts
2. Implement handler function
3. Add database operations if needed
4. Update frontend API calls

### Database Schema Extensions
1. Update schema.ts definitions
2. Add migration logic if needed
3. Update storage.ts operations
4. Modify API responses

## Performance Optimizations

### Database
- Indexed queries for conversations
- Limited message history retrieval
- Efficient user lookup by Discord ID

### Memory Management
- Voice connection cleanup
- Message history limits
- Garbage collection considerations

### API Efficiency
- Conversation context limiting
- Response caching opportunities
- Rate limit handling

## Monitoring and Logging

### Console Logging
- Bot startup/shutdown events
- Command execution logging
- Error tracking and reporting
- API call monitoring

### Statistics Tracking
- Message count tracking
- Server count updates
- API usage monitoring
- Uptime calculation

This documentation provides everything needed to recreate the Discord AI Assistant Bot in another project, including all features, configurations, and implementation details.
