import { BaseScraper, $, $$, textOf, type ScrapedConversation, type Message } from './base';

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

    // Find user and assistant message elements directly
    const userMessageEls = $$('[data-testid="user-message"]');
    const assistantMessageEls = $$('[data-is-streaming]'); // assistant turns have this attr

    if (userMessageEls.length === 0 && assistantMessageEls.length === 0) {
      return this.fallbackExtract();
    }

    // Collect all messages with their DOM elements and roles
    const allMessages: { el: Element; role: 'user' | 'assistant' }[] = [];

    for (const el of userMessageEls) {
      allMessages.push({ el, role: 'user' });
    }

    for (const el of assistantMessageEls) {
      // The content container is the .font-claude-response div inside this element
      const contentEl = el.querySelector('.font-claude-response') || el;
      allMessages.push({ el: contentEl, role: 'assistant' });
    }

    // Sort by DOM order
    allMessages.sort((a, b) => {
      const pos = a.el.compareDocumentPosition(b.el);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    for (const { el, role } of allMessages) {
      const content =
        role === 'assistant' ? this.cleanAssistantContent(el) : this.cleanContent(el);
      if (!content || content.length < 2) continue;

      // Deduplicate
      const last = messages[messages.length - 1];
      if (last && last.role === role && last.content === content) continue;

      messages.push({ role, content });
    }

    return messages;
  }

  /**
   * Fallback: if the primary strategy fails, try simpler heuristics
   */
  private fallbackExtract(): Message[] {
    console.warn('[Breadcrumps] Using fallback extraction');
    const messages: Message[] = [];

    const userEls = $$('[data-testid="user-message"]');
    // Fixed: font-claude-response, not font-claude-response-body
    const assistantEls = $$('.font-claude-response');

    if (userEls.length === 0 && assistantEls.length === 0) return messages;

    const all: { el: Element; role: 'user' | 'assistant' }[] = [];

    for (const el of userEls) {
      all.push({ el, role: 'user' });
    }
    for (const el of assistantEls) {
      all.push({ el, role: 'assistant' });
    }

    all.sort((a, b) => {
      const pos = a.el.compareDocumentPosition(b.el);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    for (const { el, role } of all) {
      const content =
        role === 'assistant' ? this.cleanAssistantContent(el) : this.cleanContent(el);
      if (!content || content.length < 2) continue;

      const last = messages[messages.length - 1];
      if (last && last.role === role && last.content === content) continue;

      messages.push({ role, content });
    }

    return messages;
  }
  /**
   * Clean assistant response content.
   * Assistant responses contain multiple block elements: p, h2, ol, ul,
   * code blocks (pre inside divs with copy buttons), etc.
   */
  private cleanAssistantContent(container: Element): string {
    if (!container) return '';

    const parts: string[] = [];
    const processedElements = new Set<Element>();

    const processNode = (node: Node, depth: number = 0) => {
      // Prevent infinite recursion
      if (depth > 50) return;

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;

        // Skip if already processed
        if (processedElements.has(el)) return;

        const tag = el.tagName.toLowerCase();

        // Skip UI elements and controls
        if (tag === 'button') return;
        if (tag === 'svg') return;
        if (tag === 'style') return;
        if (tag === 'script') return;
        if (el.getAttribute('aria-hidden') === 'true') return;
        if (el.classList.contains('bg-gradient-to-t')) return;

        // Skip copy button wrappers (but not their code content)
        if (el.querySelector('button[aria-label*="Copy"]') && !el.querySelector('pre')) return;

        // Handle paragraphs
        if (tag === 'p') {
          processedElements.add(el);
          const text = this.getTextContent(el);
          if (text.trim()) parts.push(text.trim());
          return;
        }

        // Handle headings
        if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
          processedElements.add(el);
          const text = this.getTextContent(el);
          if (text.trim()) parts.push(`\n## ${text.trim()}`);
          return;
        }

        // Handle ordered lists
        if (tag === 'ol') {
          processedElements.add(el);
          const items = el.querySelectorAll(':scope > li');
          if (items.length > 0) {
            items.forEach((li, i) => {
              processedElements.add(li);
              const text = this.getTextContent(li);
              if (text.trim()) parts.push(`${i + 1}. ${text.trim()}`);
            });
            return;
          }
        }

        // Handle unordered lists
        if (tag === 'ul') {
          processedElements.add(el);
          const items = el.querySelectorAll(':scope > li');
          if (items.length > 0) {
            items.forEach((li) => {
              processedElements.add(li);
              const text = this.getTextContent(li);
              if (text.trim()) parts.push(`- ${text.trim()}`);
            });
            return;
          }
        }

        // Handle code blocks: pre or pre>code
        if (tag === 'pre') {
          processedElements.add(el);
          const codeEl = el.querySelector('code') || el;
          const code = codeEl.textContent || '';
          if (code.trim()) {
            parts.push('```\n' + code.trim() + '\n```');
          }
          return;
        }

        // Handle code blocks wrapped in divs
        if (tag === 'div' && el.querySelector('pre')) {
          processedElements.add(el);
          const preEl = el.querySelector('pre');
          if (preEl) {
            const codeEl = preEl.querySelector('code') || preEl;
            const code = codeEl.textContent || '';
            if (code.trim()) {
              parts.push('```\n' + code.trim() + '\n```');
            }
          }
          return;
        }

        // Handle blockquotes
        if (tag === 'blockquote') {
          processedElements.add(el);
          const text = this.getTextContent(el);
          if (text.trim()) {
            parts.push('> ' + text.trim().replace(/\n/g, '\n> '));
          }
          return;
        }

        // For containers, recurse into children
        el.childNodes.forEach((child) => processNode(child, depth + 1));

      } else if (node.nodeType === Node.TEXT_NODE) {
        // Only capture direct text nodes that aren't empty
        const text = (node.textContent || '').trim();
        if (text && text.length > 0) {
          // Check if this text node is not inside any processed element
          const parent = node.parentElement;
          if (parent && !processedElements.has(parent)) {
            parts.push(text);
          }
        }
      }
    };

    container.childNodes.forEach((child) => processNode(child, 0));

    return parts
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Get text content from an element, handling inline code
   */
  private getTextContent(el: Element): string {
    let text = '';

    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tag = element.tagName.toLowerCase();

        if (tag === 'button' || tag === 'svg') return;

        if (tag === 'code') {
          // Inline code (not inside pre)
          if (element.parentElement?.tagName.toLowerCase() !== 'pre') {
            text += '`' + (element.textContent || '') + '`';
          } else {
            text += element.textContent || '';
          }
        } else if (tag === 'strong' || tag === 'b') {
          text += '**';
          element.childNodes.forEach(walk);
          text += '**';
        } else if (tag === 'em' || tag === 'i') {
          text += '*';
          element.childNodes.forEach(walk);
          text += '*';
        } else if (tag === 'br') {
          text += '\n';
        } else {
          element.childNodes.forEach(walk);
        }
      }
    };

    el.childNodes.forEach(walk);
    return text;
  }

  /**
   * Clean user message content
   */
  private cleanContent(el: Element | null): string {
    if (!el) return '';
    return this.getTextContent(el)
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  private extractTitle(): string {
    const pageTitle = document.title?.replace(/\s*[-–]\s*Claude\s*$/, '').trim();
    if (pageTitle && pageTitle.length > 0 && pageTitle !== 'Claude') {
      return pageTitle;
    }

    const activeChat = $('a[aria-current="page"]');
    if (activeChat) {
      const text = textOf(activeChat);
      if (text) return text;
    }

    return 'Untitled Claude Conversation';
  }

  private detectModel(): string | undefined {
    const modelEl = $('[data-testid="model-selector"]') || $('button[aria-label*="Model"]');
    if (modelEl) {
      const text = textOf(modelEl).toLowerCase();
      if (text.includes('opus')) return 'claude-opus';
      if (text.includes('sonnet')) return 'claude-sonnet';
      if (text.includes('haiku')) return 'claude-haiku';
    }
    return undefined;
  }
}