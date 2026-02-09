// ============================================================================
// Core data types shared between web app, extension, and API
// ============================================================================

export type ConversationSource = 'chatgpt' | 'claude' | 'gemini' | 'manual';
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id?: string;
  conversationId?: string;
  role: MessageRole;
  content: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id?: string;
  userId?: string;
  projectId?: string;
  title: string;
  source: ConversationSource;
  sourceUrl?: string;
  messages: Message[];
  metadata?: {
    model?: string;
    scrapedAt?: string;
    originalId?: string;
    [key: string]: unknown;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  conversationCount?: number;
}

export interface SearchResult {
  conversationId: string;
  conversationTitle: string;
  messageContent: string;
  messageRole: MessageRole;
  score: number;
  source: ConversationSource;
  highlightedContent?: string;
}

// Extension → Backend payload
export interface ScrapedConversation {
  title: string;
  source: ConversationSource;
  sourceUrl: string;
  messages: Message[];
  scrapedAt: string;
  metadata?: Record<string, unknown>;
}
