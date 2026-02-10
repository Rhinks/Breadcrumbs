import { BaseScraper, $, $$, textOf, type ScrapedConversation, type Message } from './base';

/**
 * ChatGPT Scraper
 * 
 * Targets: https://chatgpt.com/* and https://chat.openai.com/*
 * 
 * DOM structure (as of early 2026):
 * - Conversation container: [role="presentation"] or main thread area
 * - User messages: div[data-message-author-role="user"]
 * - Assistant messages: div[data-message-author-role="assistant"]
 * - Message content is inside .markdown or .whitespace-pre-wrap elements
 * - Title: visible in the sidebar or <title> tag
 * 
 * NOTE: ChatGPT's DOM changes frequently. These selectors may need updating.
 * The scraper uses multiple fallback strategies to be resilient.
 */
export class ChatGPTScraper implements BaseScraper {
  source = 'chatgpt' as const;

  canScrape(): boolean {
    const url = window.location.hostname;
    return url === 'chatgpt.com' || url === 'chat.openai.com';
  }

  scrapeCurrentConversation(): ScrapedConversation | null {
    try {
      const messages = this.extractMessages();

      if (messages.length === 0) {
        console.warn('[Breadcrumps] No messages found on ChatGPT page');
        return null;
      }

      return {
        title: this.extractTitle(),
        source: 'chatgpt',
        source_url: window.location.href,
        messages,
        scraped_at: new Date().toISOString(),
        metadata: {
          model: this.detectModel(),
        },
      };
    } catch (error) {
      console.error('[Breadcrumps] ChatGPT scraping error:', error);
      return null;
    }
  }

  private extractMessages(): Message[] {
    const messages: Message[] = [];

    // Strategy 1: data-message-author-role attributes (most reliable)
    const messageElements = $$('[data-message-author-role]');

    if (messageElements.length > 0) {
      for (const el of messageElements) {
        const role = el.getAttribute('data-message-author-role');
        if (role !== 'user' && role !== 'assistant') continue;

        // Find the content element within the message
        const contentEl =
          el.querySelector('.markdown') ||
          el.querySelector('.whitespace-pre-wrap') ||
          el.querySelector('[data-message-id]') ||
          el;

        const content = this.cleanContent(contentEl);
        if (!content) continue;

        messages.push({
          role: role as 'user' | 'assistant',
          content,
        });
      }

      if (messages.length > 0) return messages;
    }

    // Strategy 2: Alternating turn-based divs in main thread
    // ChatGPT sometimes renders messages as alternating groups
    const turnGroups = $$('div[data-testid^="conversation-turn-"]');

    if (turnGroups.length > 0) {
      for (const turn of turnGroups) {
        const isUser = turn.querySelector('[data-message-author-role="user"]');
        const isAssistant = turn.querySelector('[data-message-author-role="assistant"]');

        const contentEl =
          turn.querySelector('.markdown') ||
          turn.querySelector('.whitespace-pre-wrap') ||
          turn;

        const content = this.cleanContent(contentEl);
        if (!content) continue;

        messages.push({
          role: isUser ? 'user' : isAssistant ? 'assistant' : 'user',
          content,
        });
      }

      if (messages.length > 0) return messages;
    }

    // Strategy 3: Fallback — look for any .markdown or message-like containers
    console.warn('[Breadcrumps] Using fallback scraping strategy for ChatGPT');
    const markdownBlocks = $$('.markdown.prose, .whitespace-pre-wrap');

    for (let i = 0; i < markdownBlocks.length; i++) {
      const content = this.cleanContent(markdownBlocks[i]);
      if (!content) continue;

      // Heuristic: even indices = user, odd = assistant (alternating pattern)
      messages.push({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content,
      });
    }

    return messages;
  }

  private extractTitle(): string {
    // Try page title first (ChatGPT sets it to the conversation title)
    const pageTitle = document.title?.replace(' | ChatGPT', '').replace('ChatGPT', '').trim();
    if (pageTitle && pageTitle.length > 0 && pageTitle !== 'ChatGPT') {
      return pageTitle;
    }

    // Try the active sidebar item
    const activeNav = $('nav a[aria-current="page"]') || $('nav .bg-token-sidebar-surface-secondary');
    if (activeNav) {
      const navText = textOf(activeNav);
      if (navText) return navText;
    }

    // Fallback: first user message truncated
    const firstUser = $('[data-message-author-role="user"]');
    if (firstUser) {
      const text = textOf(firstUser);
      return text.substring(0, 80) + (text.length > 80 ? '...' : '');
    }

    return 'Untitled ChatGPT Conversation';
  }

  private detectModel(): string | undefined {
    // Try to find model indicator in the UI
    const modelEl =
      $('[data-testid="model-selector"]') ||
      $('button[aria-label*="Model"]') ||
      $('span.text-token-text-secondary');

    if (modelEl) {
      const text = textOf(modelEl).toLowerCase();
      if (text.includes('4o')) return 'gpt-4o';
      if (text.includes('4')) return 'gpt-4';
      if (text.includes('3.5')) return 'gpt-3.5-turbo';
      if (text.includes('o1')) return 'o1';
      if (text.includes('o3')) return 'o3';
    }

    return undefined;
  }

  /**
   * Clean extracted content:
   * - Preserve code blocks
   * - Remove empty lines
   * - Trim whitespace
   */
  private cleanContent(el: Element | null): string {
    if (!el) return '';

    // Get text content, preserving some structure
    let text = '';

    // Walk through child nodes to preserve code blocks
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = (node as Element).tagName.toLowerCase();

        if (tag === 'pre' || tag === 'code') {
          text += '\n```\n' + (node as Element).textContent + '\n```\n';
        } else if (tag === 'br') {
          text += '\n';
        } else if (tag === 'p' || tag === 'div' || tag === 'li') {
          text += '\n';
          node.childNodes.forEach(walk);
          text += '\n';
        } else {
          node.childNodes.forEach(walk);
        }
      }
    };

    el.childNodes.forEach(walk);

    return text
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
