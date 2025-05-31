import OpenAI from "openai";
import type { Message } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.API_KEY 
});

export async function generateAIResponse(
  message: string,
  contextMessages: Message[] = [],
  personality?: string,
  responseLength?: string
): Promise<string> {
  try {
    let systemPrompt = "You are a helpful AI assistant in a Discord server. ";
    
    // Personality customization
    switch (personality) {
      case 'friendly':
        systemPrompt += "Be warm, casual, and use friendly language. Use emojis occasionally to show enthusiasm. ";
        break;
      case 'technical':
        systemPrompt += "Be precise, technical, and detailed in your responses. Focus on accuracy and provide code examples when relevant. ";
        break;
      case 'creative':
        systemPrompt += "Be imaginative, creative, and think outside the box. Encourage creative thinking and exploration. ";
        break;
      default:
        systemPrompt += "Be helpful, clear, and informative. ";
    }
    
    // Response length customization
    switch (responseLength) {
      case 'concise':
        systemPrompt += "Keep responses brief and to the point. Aim for 1-2 sentences when possible.";
        break;
      case 'detailed':
        systemPrompt += "Provide comprehensive and detailed responses with examples and explanations.";
        break;
      default:
        systemPrompt += "Provide balanced responses that are informative but not overly long.";
    }

    // Build conversation context
    const conversationMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt }
    ];

    // Add recent conversation context
    for (const contextMessage of contextMessages) {
      conversationMessages.push({
        role: contextMessage.role as 'user' | 'assistant',
        content: contextMessage.content
      });
    }

    // Add current message if not already in context
    const lastMessage = contextMessages[contextMessages.length - 1];
    if (!lastMessage || lastMessage.content !== message) {
      conversationMessages.push({
        role: "user",
        content: message
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversationMessages,
      max_tokens: responseLength === 'detailed' ? 1500 : responseLength === 'concise' ? 500 : 1000,
      temperature: personality === 'creative' ? 0.8 : 0.7,
    });

    return response.choices[0].message.content || "I apologize, but I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error('Error generating AI response:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return "I'm currently experiencing high demand. Please try again in a moment.";
      } else if (error.message.includes('API key')) {
        return "There's an issue with my configuration. Please contact the server administrator.";
      }
    }
    
    return "I encountered an error while processing your request. Please try again later.";
  }
}

export async function testOpenAIConnection(): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Test connection" }],
      max_tokens: 10,
    });
    
    return response.choices[0].message.content !== null;
  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    return false;
  }
}
