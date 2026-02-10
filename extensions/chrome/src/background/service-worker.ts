import browser from 'webextension-polyfill';

const API_URL = 'http://localhost:8000';

browser.runtime.onInstalled.addListener(() => {
  console.log('[Breadcrumps] Extension installed');
});

browser.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as { type: string; conversation?: any };

  if (msg.type === 'SAVE_CONVERSATION') {
    const { conversation } = msg;

    // Send scraped conversation to FastAPI backend
    return fetch(`${API_URL}/api/conversations/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: conversation.title,
        source: conversation.source,
        source_url: conversation.source_url,
        messages: conversation.messages,
        scraped_at: conversation.scraped_at,
        metadata: conversation.metadata || {},
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log('[Breadcrumps] Saved to backend:', data.id);
        return { success: true, id: data.id };
      })
      .catch((err) => {
        console.error('[Breadcrumps] Save failed:', err);
        return { success: false, error: err.message };
      });
  }

  return Promise.resolve();
});
