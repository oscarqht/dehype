import { ExtensionMessage, ExtensionResponse } from '../shared/types';

const apiKeyStatus = document.getElementById('apiKeyStatus') as HTMLSpanElement;
const cacheCount = document.getElementById('cacheCount') as HTMLSpanElement;
const openOptionsBtn = document.getElementById('openOptionsBtn') as HTMLButtonElement;
const clearCacheBtn = document.getElementById('clearCacheBtn') as HTMLButtonElement;

async function updateStatus() {
  try {
    const keyRes = (await chrome.runtime.sendMessage({
      type: 'CHECK_API_KEY',
    } as ExtensionMessage)) as ExtensionResponse;

    if (keyRes && keyRes.success && 'apiKeyConfigured' in keyRes && keyRes.apiKeyConfigured) {
      apiKeyStatus.textContent = 'Configured ✅';
      apiKeyStatus.className = 'status-value ok';
    } else {
      apiKeyStatus.textContent = 'Missing ⚠️';
      apiKeyStatus.className = 'status-value warn';
    }

    const cacheRes = (await chrome.runtime.sendMessage({
      type: 'GET_CACHE_STATS',
    } as ExtensionMessage)) as ExtensionResponse;

    if (cacheRes && cacheRes.success && 'stats' in cacheRes && cacheRes.stats) {
      cacheCount.textContent = `${cacheRes.stats.count} / ${cacheRes.stats.maxSize}`;
    }
  } catch (err) {
    console.debug('Error updating popup status:', err);
  }
}

openOptionsBtn.addEventListener('click', () => {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
});

clearCacheBtn.addEventListener('click', async () => {
  try {
    await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' } as ExtensionMessage);
    await updateStatus();
  } catch (err) {
    console.debug('Error clearing cache:', err);
  }
});

updateStatus();
