import type { ScrapedConversation, Message, ConversationSource } from './types';

// Re-export types the scrapers need
export type { ScrapedConversation, Message, ConversationSource };

/**
 * Base interface for all site-specific scrapers.
 * Each scraper knows how to extract conversations from a specific AI chat UI.
 */
export interface BaseScraper {
  /** Which source this scraper handles */
  source: ConversationSource;

  /** Check if this scraper can handle the current page */
  canScrape(): boolean;

  /** Extract the current conversation from the DOM */
  scrapeCurrentConversation(): ScrapedConversation | null;
}

/**
 * Helper: safely query a single element
 */
export function $(selector: string, parent: Element | Document = document): Element | null {
  return parent.querySelector(selector);
}

/**
 * Helper: safely query all elements
 */
export function $$(selector: string, parent: Element | Document = document): Element[] {
  return Array.from(parent.querySelectorAll(selector));
}

/**
 * Helper: get clean text content from an element
 */
export function textOf(el: Element | null): string {
  if (!el) return '';
  return el.textContent?.trim() || '';
}

/**
 * Helper: get innerHTML cleaned up (preserves code blocks, links, etc.)
 */
export function htmlOf(el: Element | null): string {
  if (!el) return '';
  return el.innerHTML?.trim() || '';
}
