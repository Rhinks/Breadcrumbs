import { detectScraper } from './scrapers/detector';

/**
 * Content script - runs on ChatGPT and Claude pages.
 * 
 * Listens for messages from the popup/background script to trigger scraping.
 * Does NOT scrape automatically — only when the user clicks the button.
 */

console.log('[Breadcrumps] Content script loaded on', window.location.hostname);

// Listen for scrape requests from popup or background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SCRAPE_CONVERSATION') {
    console.log('[Breadcrumps] Scrape request received');

    const scraper = detectScraper();

    if (!scraper) {
      sendResponse({
        success: false,
        error: 'This site is not supported. Open ChatGPT or Claude.',
      });
      return true;
    }

    try {
      const conversation = scraper.scrapeCurrentConversation();

      if (!conversation || conversation.messages.length === 0) {
        sendResponse({
          success: false,
          error: 'No conversation found on this page. Make sure a conversation is open.',
        });
        return true;
      }

      console.log(
        `[Breadcrumps] Scraped ${conversation.messages.length} messages from ${conversation.source}`
      );

      sendResponse({
        success: true,
        conversation,
      });
    } catch (error) {
      console.error('[Breadcrumps] Scraping failed:', error);
      sendResponse({
        success: false,
        error: `Scraping failed: ${(error as Error).message}`,
      });
    }

    return true; // Keep message channel open for async response
  }

  if (message.type === 'PING') {
    sendResponse({ alive: true, site: window.location.hostname });
    return true;
  }
});
