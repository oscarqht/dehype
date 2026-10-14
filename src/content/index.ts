import { getCachedTweets, setCachedTweets, computeTextHash } from '../shared/cache';
import { formatDehypedTextHtml, countWords, MIN_WORDS_TO_DEHYPE } from '../shared/text';
import { ExtensionMessage, ExtensionResponse } from '../shared/types';

const inFlightTweetIds = new Set<string>();
let isApiKeyConfigured: boolean | null = null;

/**
 * Checks with background script if API key is configured
 */
async function checkApiKeyConfigured(): Promise<boolean> {
  if (isApiKeyConfigured !== null) return isApiKeyConfigured;
  try {
    const res = (await chrome.runtime.sendMessage({
      type: 'CHECK_API_KEY',
    } as ExtensionMessage)) as ExtensionResponse;
    if (res && res.success && 'apiKeyConfigured' in res) {
      isApiKeyConfigured = Boolean(res.apiKeyConfigured);
      return isApiKeyConfigured;
    }
  } catch (err) {
    console.debug('[Dehype Content] Error checking API key:', err);
  }
  return false;
}

// Listen for storage changes in case user sets API key
chrome.storage?.onChanged?.addListener((changes) => {
  if (changes['dehype_api_key']) {
    isApiKeyConfigured = Boolean(changes['dehype_api_key'].newValue);
    if (isApiKeyConfigured) {
      // Re-scan feed when key is saved
      scanAndProcessTweets();
    }
  }
});

/**
 * Extracts the primary tweet ID from an article element, or generates a text hash fallback
 */
function getTweetIdentifier(article: HTMLElement, rawText: string): string {
  // Look for status links in the article
  const statusLink = article.querySelector<HTMLAnchorElement>('a[href*="/status/"]');
  if (statusLink && statusLink.href) {
    const match = statusLink.href.match(/\/status\/(\d+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return computeTextHash(rawText);
}

/**
 * Creates loading skeleton element
 */
function createSkeleton(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dehype-skeleton-container';
  container.innerHTML = `
    <div class="dehype-skeleton-line w-full"></div>
    <div class="dehype-skeleton-line w-80"></div>
    <div class="dehype-skeleton-line w-50"></div>
  `;
  return container;
}

/**
 * Renders dehyped content and toggle button into tweet
 */
function applyDehypedContent(
  textEl: HTMLElement,
  originalHtml: string,
  dehypedText: string
) {
  textEl.innerHTML = '';

  const badgeWrapper = document.createElement('div');
  badgeWrapper.className = 'dehype-badge-wrapper';

  const badge = document.createElement('span');
  badge.className = 'dehype-badge';
  badge.innerHTML = `✨ Dehyped`;
  badge.title = 'Click to toggle between dehyped and original text';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'dehype-content-rendered';
  const dehypedHtml = formatDehypedTextHtml(dehypedText);
  contentDiv.innerHTML = dehypedHtml;

  let showingOriginal = false;
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    showingOriginal = !showingOriginal;
    if (showingOriginal) {
      badge.innerHTML = `↩ Original`;
      badge.classList.add('showing-original');
      contentDiv.innerHTML = originalHtml;
    } else {
      badge.innerHTML = `✨ Dehyped`;
      badge.classList.remove('showing-original');
      contentDiv.innerHTML = dehypedHtml;
    }
  });

  badgeWrapper.appendChild(badge);
  textEl.appendChild(badgeWrapper);
  textEl.appendChild(contentDiv);
  textEl.dataset.dehypeState = 'done';
}

/**
 * Reverts tweet to original text with a retry button
 */
function applyFailedContent(
  textEl: HTMLElement,
  originalHtml: string,
  onRetry: () => void
) {
  textEl.innerHTML = '';

  const badgeWrapper = document.createElement('div');
  badgeWrapper.className = 'dehype-badge-wrapper';

  const retryBadge = document.createElement('span');
  retryBadge.className = 'dehype-badge-retry';
  retryBadge.innerHTML = `⚠️ Dehype failed · Click to retry`;
  retryBadge.title = 'Click to retry dehyping this post';

  retryBadge.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    onRetry();
  });

  const contentDiv = document.createElement('div');
  contentDiv.className = 'dehype-content-rendered';
  contentDiv.innerHTML = originalHtml;

  badgeWrapper.appendChild(retryBadge);
  textEl.appendChild(badgeWrapper);
  textEl.appendChild(contentDiv);
  textEl.dataset.dehypeState = 'failed';
}

/**
 * Sends a single tweet to background service worker for dehyping
 */
async function dehypeTweet(
  tweetId: string,
  rawText: string,
  textEl: HTMLElement,
  originalHtml: string
) {
  if (inFlightTweetIds.has(tweetId)) return;
  inFlightTweetIds.add(tweetId);

  // Show loading skeleton immediately
  textEl.dataset.dehypeState = 'loading';
  textEl.innerHTML = '';
  textEl.appendChild(createSkeleton());

  try {
    const response = (await chrome.runtime.sendMessage({
      type: 'DEHYPE_TEXT',
      text: rawText,
    } as ExtensionMessage)) as ExtensionResponse;

    if (response && response.success && 'data' in response && response.data) {
      inFlightTweetIds.delete(tweetId);
      const { result, isHype } = response.data;
      const dehypedText = result || rawText;

      if (isHype && result) {
        applyDehypedContent(textEl, originalHtml, dehypedText);
      } else {
        textEl.innerHTML = originalHtml;
        textEl.dataset.dehypeState = 'done';
      }

      // Save to 500-item LRU cache
      await setCachedTweets([
        {
          key: tweetId,
          originalText: rawText,
          dehypedText,
          isHype: Boolean(isHype && result),
        },
      ]);
    } else {
      const errMsg = (!response?.success && response?.error) || 'API error';
      console.warn('[Dehype] Request failed:', errMsg);
      inFlightTweetIds.delete(tweetId);
      applyFailedContent(textEl, originalHtml, () => {
        dehypeTweet(tweetId, rawText, textEl, originalHtml);
      });
    }
  } catch (err) {
    console.error('[Dehype] Network/Worker error:', err);
    inFlightTweetIds.delete(tweetId);
    applyFailedContent(textEl, originalHtml, () => {
      dehypeTweet(tweetId, rawText, textEl, originalHtml);
    });
  }
}

/**
 * Process a single tweet element
 */
async function processTweet(article: HTMLElement) {
  // Find tweet text elements inside article
  const tweetTextElements = Array.from(
    article.querySelectorAll<HTMLElement>('[data-testid="tweetText"]')
  );
  if (!tweetTextElements.length) return;

  // Q10: B - Top-level tweets only, ignore quoted tweets
  // Find the primary tweet text: not inside an inner quote link card
  const primaryTextEl = tweetTextElements.find((el) => {
    const parentLink = el.closest('[role="link"]');
    // If the text container is inside an inner role="link" container inside the article, it is a quoted tweet
    return !parentLink || parentLink === article;
  }) || tweetTextElements[0];

  if (!primaryTextEl || primaryTextEl.dataset.dehypeState) {
    return;
  }

  const rawText = primaryTextEl.innerText.trim();
  if (!rawText) {
    return;
  }

  // Only dehype tweets with more than 10 words (exclude short tweets)
  if (countWords(rawText) <= MIN_WORDS_TO_DEHYPE) {
    primaryTextEl.dataset.dehypeState = 'skipped';
    return;
  }

  const tweetId = getTweetIdentifier(article, rawText);
  if (inFlightTweetIds.has(tweetId)) {
    return;
  }

  const originalHtml = primaryTextEl.innerHTML;

  // Check LRU Cache first
  const cached = await getCachedTweets([tweetId]);
  if (primaryTextEl.dataset.dehypeState) {
    return;
  }
  if (cached.has(tweetId)) {
    const entry = cached.get(tweetId)!;
    if (entry.isHype === false) {
      primaryTextEl.dataset.dehypeState = 'done';
      return;
    }
    applyDehypedContent(primaryTextEl, originalHtml, entry.dehypedText);
    return;
  }

  // If not cached, verify API key before modifying DOM
  const hasKey = await checkApiKeyConfigured();
  if (!hasKey || primaryTextEl.dataset.dehypeState) {
    // Leave tweet untouched if user hasn't configured an API key
    return;
  }

  dehypeTweet(tweetId, rawText, primaryTextEl, originalHtml);
}

/**
 * Scans the page for all unprocessed tweets
 */
function scanAndProcessTweets() {
  const articles = document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]');
  articles.forEach((article) => {
    processTweet(article);
  });
}

// Initialize observer for dynamic Twitter/X feed
function initObserver() {
  const observer = new MutationObserver((mutations) => {
    let hasNewTweets = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        hasNewTweets = true;
        break;
      }
    }
    if (hasNewTweets) {
      scanAndProcessTweets();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial scan
  scanAndProcessTweets();
}

// Start when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initObserver);
} else {
  initObserver();
}
