import { getApiKey, setApiKey } from '../shared/api';
import { ExtensionMessage, ExtensionResponse } from '../shared/types';

const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
const toggleKeyVisibilityBtn = document.getElementById('toggleKeyVisibility') as HTMLButtonElement;
const saveKeyBtn = document.getElementById('saveKeyBtn') as HTMLButtonElement;
const testKeyBtn = document.getElementById('testKeyBtn') as HTMLButtonElement;
const apiStatusBadge = document.getElementById('apiStatusBadge') as HTMLSpanElement;

const cacheStatText = document.getElementById('cacheStatText') as HTMLDivElement;
const clearCacheBtn = document.getElementById('clearCacheBtn') as HTMLButtonElement;
const cacheStatusBadge = document.getElementById('cacheStatusBadge') as HTMLSpanElement;

function showBadge(badge: HTMLSpanElement, text: string, type: 'success' | 'error' | 'loading') {
  badge.textContent = text;
  badge.className = `status-badge show ${type}`;
}

function hideBadge(badge: HTMLSpanElement) {
  badge.className = 'status-badge';
  badge.textContent = '';
}

// Load existing settings
async function loadSettings() {
  const existingKey = await getApiKey();
  if (existingKey) {
    apiKeyInput.value = existingKey;
  }
  await updateCacheStats();
}

async function updateCacheStats() {
  try {
    const res = (await chrome.runtime.sendMessage({
      type: 'GET_CACHE_STATS',
    } as ExtensionMessage)) as ExtensionResponse;

    if (res && res.success && 'stats' in res && res.stats) {
      cacheStatText.textContent = `${res.stats.count} / ${res.stats.maxSize} tweets cached`;
    } else {
      cacheStatText.textContent = '0 / 500 tweets cached';
    }
  } catch (err) {
    console.debug('Error getting cache stats:', err);
    cacheStatText.textContent = '0 / 500 tweets cached';
  }
}

// Toggle password field visibility
toggleKeyVisibilityBtn.addEventListener('click', () => {
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleKeyVisibilityBtn.textContent = '🔒';
  } else {
    apiKeyInput.type = 'password';
    toggleKeyVisibilityBtn.textContent = '👁️';
  }
});

// Save key
saveKeyBtn.addEventListener('click', async () => {
  const val = apiKeyInput.value.trim();
  if (!val) {
    showBadge(apiStatusBadge, 'Key cannot be empty', 'error');
    return;
  }

  showBadge(apiStatusBadge, 'Saving...', 'loading');
  try {
    await setApiKey(val);
    showBadge(apiStatusBadge, 'Saved successfully! ✨', 'success');
    setTimeout(() => hideBadge(apiStatusBadge), 3000);
  } catch (err) {
    showBadge(apiStatusBadge, 'Failed to save key', 'error');
  }
});

// Test connection
testKeyBtn.addEventListener('click', async () => {
  const val = apiKeyInput.value.trim();
  if (!val) {
    showBadge(apiStatusBadge, 'Please enter a key to test', 'error');
    return;
  }

  showBadge(apiStatusBadge, 'Testing connection...', 'loading');
  testKeyBtn.disabled = true;

  try {
    const res = (await chrome.runtime.sendMessage({
      type: 'TEST_API_KEY',
      apiKey: val,
    } as ExtensionMessage)) as ExtensionResponse;

    if (res && res.success) {
      showBadge(apiStatusBadge, 'Connection verified! ✅', 'success');
    } else {
      const msg = (!res.success && res.error) || 'Test failed';
      showBadge(apiStatusBadge, `Error: ${msg}`, 'error');
    }
  } catch (err) {
    showBadge(apiStatusBadge, `Network error: ${String(err)}`, 'error');
  } finally {
    testKeyBtn.disabled = false;
  }
});

// Clear cache
clearCacheBtn.addEventListener('click', async () => {
  if (!confirm('Are you sure you want to clear all cached tweets?')) return;

  try {
    await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' } as ExtensionMessage);
    showBadge(cacheStatusBadge, 'Cache cleared! 🧹', 'success');
    await updateCacheStats();
    setTimeout(() => hideBadge(cacheStatusBadge), 3000);
  } catch (err) {
    showBadge(cacheStatusBadge, 'Failed to clear cache', 'error');
  }
});

loadSettings();
