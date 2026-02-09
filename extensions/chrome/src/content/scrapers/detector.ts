import { ChatGPTScraper } from './chatgpt';
import { ClaudeScraper } from './claude';
import type { BaseScraper } from './base';

const scrapers: BaseScraper[] = [
  new ChatGPTScraper(),
  new ClaudeScraper(),
];

/**
 * Detect which AI chat site we're on and return the appropriate scraper.
 */
export function detectScraper(): BaseScraper | null {
  for (const scraper of scrapers) {
    if (scraper.canScrape()) {
      console.log(`[Breadcrumps] Detected site: ${scraper.source}`);
      return scraper;
    }
  }
  console.log('[Breadcrumps] No supported AI chat site detected');
  return null;
}

/**
 * Get the source name for the current site (without needing a full scraper).
 */
export function detectSite(): string | null {
  const hostname = window.location.hostname;
  if (hostname === 'chatgpt.com' || hostname === 'chat.openai.com') return 'chatgpt';
  if (hostname === 'claude.ai') return 'claude';
  if (hostname === 'gemini.google.com') return 'gemini';
  return null;
}
