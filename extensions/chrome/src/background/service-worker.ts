import browser from 'webextension-polyfill';

/**
 * Background service worker for the Breadcrumps extension.
 * 
 * Handles:
 * - Communication between popup and content scripts
 * - Storing scraped data temporarily
 * - Sending data to the backend API
 */

browser.runtime.onInstalled.addListener(() => {
  console.log('[Breadcrumps] Extension installed');
});

// Relay messages between popup and content scripts if needed
browser.runtime.onMessage.addListener((message: { type: string; conversation?: unknown }) => {
  if (message.type === 'SAVE_CONVERSATION') {
    // For MVP: store in browser.storage.local
    // Later: send to backend API
    const { conversation } = message;
    const key = `conv_${Date.now()}`;

    return browser.storage.local.set({ [key]: conversation }).then(() => {
      console.log(`[Breadcrumps] Saved conversation`);
      return { success: true, key };
    });
  }

  if (message.type === 'GET_SAVED_CONVERSATIONS') {
    return browser.storage.local.get(null).then((items) => {
      const conversations = Object.entries(items)
        .filter(([key]) => key.startsWith('conv_'))
        .map(([key, value]) => ({ key, ...value as object }));

      return { conversations };
    });
  }

  return Promise.resolve();
});
