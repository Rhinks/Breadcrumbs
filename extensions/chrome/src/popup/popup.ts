/**
 * Popup script — handles the extension popup UI.
 * 
 * Flow:
 * 1. On open: detect if we're on a supported site
 * 2. User clicks "Scrape" → send message to content script
 * 3. Content script scrapes DOM → returns structured conversation
 * 4. Show result + options (copy JSON, save locally)
 */

const statusEl = document.getElementById('status')!;
const scrapeBtn = document.getElementById('scrapeBtn') as HTMLButtonElement;
const resultEl = document.getElementById('result')!;
const errorEl = document.getElementById('error')!;

// Check current tab on popup open
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (!tab?.id || !tab.url) {
    showStatus('Open a ChatGPT or Claude conversation first.', 'unsupported');
    return;
  }

  const url = new URL(tab.url);
  const hostname = url.hostname;

  if (hostname === 'chatgpt.com' || hostname === 'chat.openai.com') {
    showStatus('✓ ChatGPT detected — ready to scrape', 'detected');
    scrapeBtn.disabled = false;
  } else if (hostname === 'claude.ai') {
    showStatus('✓ Claude detected — ready to scrape', 'detected');
    scrapeBtn.disabled = false;
  } else {
    showStatus('Navigate to ChatGPT or Claude to scrape a conversation.', 'unsupported');
  }
});

// Scrape button click handler
scrapeBtn.addEventListener('click', async () => {
  scrapeBtn.disabled = true;
  scrapeBtn.textContent = 'Scraping...';
  errorEl.style.display = 'none';
  resultEl.style.display = 'none';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');

    // Send scrape request to content script
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_CONVERSATION' });

    if (!response.success) {
      throw new Error(response.error || 'Scraping failed');
    }

    const { conversation } = response;

    // Show result
    resultEl.innerHTML = `
      <div>
        <strong class="title">${escapeHtml(conversation.title)}</strong><br>
        <span class="count">${conversation.messages.length}</span> messages from 
        <strong>${conversation.source}</strong>
      </div>
      <div class="actions">
        <button class="btn-sm" id="copyBtn">📋 Copy JSON</button>
        <button class="btn-sm" id="downloadBtn">💾 Download</button>
        <button class="btn-sm" id="saveBtn">☁️ Save</button>
      </div>
    `;
    resultEl.style.display = 'block';

    // Copy JSON
    document.getElementById('copyBtn')!.addEventListener('click', () => {
      navigator.clipboard.writeText(JSON.stringify(conversation, null, 2));
      document.getElementById('copyBtn')!.textContent = '✓ Copied!';
    });

    // Download as JSON file
    document.getElementById('downloadBtn')!.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(conversation, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${conversation.source}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Save to chrome.storage (and later backend)
    document.getElementById('saveBtn')!.addEventListener('click', () => {
      chrome.runtime.sendMessage(
        { type: 'SAVE_CONVERSATION', conversation },
        (resp) => {
          if (resp?.success) {
            document.getElementById('saveBtn')!.textContent = '✓ Saved!';
          }
        }
      );
    });

    scrapeBtn.textContent = 'Scrape Again';
    scrapeBtn.disabled = false;

  } catch (err) {
    const msg = (err as Error).message;
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    scrapeBtn.textContent = 'Scrape This Conversation';
    scrapeBtn.disabled = false;
  }
});

function showStatus(text: string, type: 'detected' | 'unsupported' | 'idle') {
  statusEl.textContent = text;
  statusEl.className = `status ${type}`;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
