/**
 * Background service worker for the Breadcrumps extension.
 * 
 * Handles:
 * - Communication between popup and content scripts
 * - Storing scraped data temporarily
 * - Sending data to the backend API
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Breadcrumps] Extension installed');
});

// Relay messages between popup and content scripts if needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_CONVERSATION') {
    // For MVP: store in chrome.storage.local
    // Later: send to backend API
    const { conversation } = message;
    const key = `conv_${Date.now()}`;

    chrome.storage.local.set({ [key]: conversation }, () => {
      console.log(`[Breadcrumps] Saved conversation: ${conversation.title}`);
      sendResponse({ success: true, key });
    });

    return true;
  }

  if (message.type === 'GET_SAVED_CONVERSATIONS') {
    chrome.storage.local.get(null, (items) => {
      const conversations = Object.entries(items)
        .filter(([key]) => key.startsWith('conv_'))
        .map(([key, value]) => ({ key, ...value as object }));

      sendResponse({ conversations });
    });

    return true;
  }
});
