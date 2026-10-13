import { runDehypeBatch, testApiKey, getApiKey, API_KEY_STORAGE_KEY } from '../shared/api';
import { getCacheStats, clearCache } from '../shared/cache';
import { ExtensionMessage } from '../shared/types';

async function updateBadgeStatus() {
  try {
    const key = await getApiKey();
    if (!key) {
      await chrome.action.setBadgeText({ text: '!' });
      await chrome.action.setBadgeBackgroundColor({ color: '#E0245E' });
      await chrome.action.setTitle({ title: 'Dehype: API key required in options' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
      await chrome.action.setTitle({ title: 'Dehype for Twitter / X' });
    }
  } catch (err) {
    console.debug('[Dehype Background] Badge update error:', err);
  }
}

// Update badge when extension installs or starts
chrome.runtime.onInstalled.addListener(async () => {
  await updateBadgeStatus();
});

chrome.runtime.onStartup?.addListener(async () => {
  await updateBadgeStatus();
});

// Watch for API key changes in storage
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (changes[API_KEY_STORAGE_KEY]) {
    updateBadgeStatus();
  }
});

// Centralized message handling
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'CHECK_API_KEY': {
          const key = await getApiKey();
          sendResponse({ success: true, apiKeyConfigured: Boolean(key) });
          break;
        }

        case 'DEHYPE_BATCH': {
          if (!message.texts || !message.texts.length) {
            sendResponse({ success: true, results: [] });
            return;
          }
          const results = await runDehypeBatch(message.texts);
          sendResponse({ success: true, results });
          break;
        }

        case 'TEST_API_KEY': {
          if (!message.apiKey) {
            sendResponse({ success: false, error: 'API key is empty' });
            return;
          }
          await testApiKey(message.apiKey);
          sendResponse({ success: true });
          break;
        }

        case 'GET_CACHE_STATS': {
          const stats = await getCacheStats();
          sendResponse({ success: true, stats });
          break;
        }

        case 'CLEAR_CACHE': {
          await clearCache();
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      sendResponse({ success: false, error: errMsg });
    }
  })();

  // Return true to keep message channel open for async sendResponse
  return true;
});
