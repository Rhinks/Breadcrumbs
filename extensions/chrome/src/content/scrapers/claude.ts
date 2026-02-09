import { BaseScraper, $, $$, textOf, type ScrapedConversation, type Message } from './base';

/**
 * Claude Scraper
 * 
 * Targets: https://claude.ai/*
 * 
 * DOM structure (as of early 2026):
 * - Conversation container: div with role-based message groups
 * - User messages: div[data-is-streaming="false"] with "human" turn indicators
 *   Often identifiable by avatar/icon differences or data attributes
 * - Assistant messages: similarly structured with "assistant" indicators
 * - Content: .font-claude-message or prose/markdown containers
 * 
 * Claude's DOM is React-based and uses data attributes extensively.
 * The scraper uses multiple heuristics for resilience.
 */
export class ClaudeScraper implements BaseScraper {
  source = 'claude' as const;

  canScrape(): boolean {
    return window.location.hostname === 'claude.ai';
  }

  scrapeCurrentConversation(): ScrapedConversation | null {
    try {
      const messages = this.extractMessages();

      if (messages.length === 0) {
        console.warn('[Breadcrumps] No messages found on Claude page');
        return null;
      }

      return {
        title: this.extractTitle(),
        source: 'claude',
        sourceUrl: window.location.href,
        messages,
        scrapedAt: new Date().toISOString(),
        metadata: {
          model: this.detectModel(),
        },
      };
    } catch (error) {
      console.error('[Breadcrumps] Claude scraping error:', error);
      return null;
    }
  }

  private extractMessages(): Message[] {
    const messages: Message[] = [];

    // Strategy 1: Look for message containers with role indicators
    // Claude uses a thread layout where each message group has distinguishing features
    const messageGroups = $$('[data-testid^="chat-message-"]');

    if (messageGroups.length > 0) {
      for (const group of messageGroups) {
        const testId = group.getAttribute('data-testid') || '';
        const role = testId.includes('user') ? 'user' : 'assistant';

        const contentEl =
          group.querySelector('.font-claude-message') ||
          group.querySelector('.prose') ||
          group.querySelector('.markdown') ||
          group;

        const content = this.cleanContent(contentEl);
        if (!content) continue;

        messages.push({ role, content });
      }

      if (messages.length > 0) return messages;
    }

    // Strategy 2: Alternating message blocks
    // Claude renders messages in a scrollable thread. User messages typically have
    // a different background/container than assistant messages.
    const threadContainer =
      $('[data-testid="chat-thread"]') ||
      $('main .overflow-y-auto') ||
      $('main');

    if (threadContainer) {
      // Look for direct child divs that represent message turns
      const turns = Array.from(threadContainer.children).filter(
        (child) => child.tagName === 'DIV' && child.textContent && child.textContent.trim().length > 0
      );

      // Heuristic: detect role by checking for user avatar, background color, or structure
      for (const turn of turns) {
        const content = this.cleanContent(turn);
        if (!content || content.length < 2) continue;

        const role = this.detectRole(turn);
        messages.push({ role, content });
      }

      if (messages.length > 0) return messages;
    }

    // Strategy 3: Look for .font-claude-message (assistant) and other blocks (user)
    console.warn('[Breadcrumps] Using fallback scraping strategy for Claude');
    const allBlocks = $$('.font-claude-message, [data-is-streaming]');

    for (const block of allBlocks) {
      const isAssistant =
        block.classList.contains('font-claude-message') ||
        block.closest('[data-is-streaming]') !== null;

      const content = this.cleanContent(block);
      if (!content) continue;

      messages.push({
        role: isAssistant ? 'assistant' : 'user',
        content,
      });
    }

    return messages;
  }

  /**
   * Detect whether a message turn element is from user or assistant.
   * Uses multiple heuristics since Claude's DOM varies.
   */
  private detectRole(el: Element): 'user' | 'assistant' {
    // Check for Claude's font class (assistant messages)
    if (el.querySelector('.font-claude-message')) return 'assistant';

    // Check for streaming indicator (assistant)
    if (el.querySelector('[data-is-streaming]')) return 'assistant';

    // Check for user avatar indicators
    const hasUserAvatar =
      el.querySelector('img[alt*="User"]') ||
      el.querySelector('[data-testid="user-avatar"]');
    if (hasUserAvatar) return 'user';

    // Check background color heuristic
    // User messages in Claude often have a slightly different background
    const style = window.getComputedStyle(el);
    const bg = style.backgroundColor;
    // This is fragile but can help as a last resort

    // Check for code blocks, longer content (more likely assistant)
    const hasCode = el.querySelector('pre, code');
    const textLength = (el.textContent || '').length;
    if (hasCode && textLength > 500) return 'assistant';

    // Default: alternate based on position
    const parent = el.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(el);
      return index % 2 === 0 ? 'user' : 'assistant';
    }

    return 'user';
  }

  private extractTitle(): string {
    // Claude page title format: "conversation title - Claude"
    const pageTitle = document.title?.replace(/\s*[-–]\s*Claude\s*$/, '').trim();
    if (pageTitle && pageTitle.length > 0 && pageTitle !== 'Claude') {
      return pageTitle;
    }

    // Try sidebar active item
    const activeChat = $('a[aria-current="page"]') || $('nav .bg-accent');
    if (activeChat) {
      const text = textOf(activeChat);
      if (text) return text;
    }

    // Fallback: first message content
    const firstBlock = $('[data-testid^="chat-message-"]');
    if (firstBlock) {
      const text = textOf(firstBlock);
      return text.substring(0, 80) + (text.length > 80 ? '...' : '');
    }

    return 'Untitled Claude Conversation';
  }

  private detectModel(): string | undefined {
    // Look for model selector or indicator
    const modelEl = $('[data-testid="model-selector"]') || $('button[aria-label*="Model"]');
    if (modelEl) {
      const text = textOf(modelEl).toLowerCase();
      if (text.includes('opus')) return 'claude-opus';
      if (text.includes('sonnet')) return 'claude-sonnet';
      if (text.includes('haiku')) return 'claude-haiku';
    }
    return undefined;
  }

  private cleanContent(el: Element | null): string {
    if (!el) return '';

    let text = '';

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
