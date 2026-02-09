export const SOURCES = {
  CHATGPT: 'chatgpt' as const,
  CLAUDE: 'claude' as const,
  GEMINI: 'gemini' as const,
  PERPLEXITY: 'perplexity' as const,
  MANUAL: 'manual' as const,
};

export const SUPPORTED_URLS = {
  chatgpt: ['https://chatgpt.com', 'https://chat.openai.com'],
  claude: ['https://claude.ai'],
  gemini: ['https://gemini.google.com'],
  perplexity: ['https://www.perplexity.ai'],
};

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;
