let wordSegmenter: Intl.Segmenter | null = null;

function getWordSegmenter(): Intl.Segmenter | null {
  if (wordSegmenter) return wordSegmenter;
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    wordSegmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
    return wordSegmenter;
  }
  return null;
}

export const MIN_WORDS_TO_DEHYPE = 10;

/**
 * Counts the number of words in a text string.
 * Supports both space-delimited languages (English) and non-space-delimited
 * languages (Chinese) using Intl.Segmenter with a regex fallback.
 * Strips URLs to prevent URL path segments from inflating word counts.
 */
export function countWords(text: string): number {
  if (!text) return 0;

  // Strip URLs so URL path segments don't inflate word count
  const cleanText = text.replace(/(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g, ' ').trim();
  if (!cleanText) return 0;

  const segmenter = getWordSegmenter();
  if (segmenter) {
    let count = 0;
    for (const segment of segmenter.segment(cleanText)) {
      if (segment.isWordLike) {
        count++;
      }
    }
    return count;
  }

  // Fallback if Intl.Segmenter is not supported:
  // Count CJK Han characters individually and non-Han word-like alphanumeric tokens
  const hanMatches = cleanText.match(/\p{Script=Han}/gu) || [];
  const wordsWithoutHan = cleanText.replace(/\p{Script=Han}/gu, ' ');
  const otherWords = wordsWithoutHan.match(/[\p{L}\p{N}]+/gu) || [];
  return hanMatches.length + otherWords.length;
}

/**
 * Safely escapes HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parses dehyped plain text and formats it with:
 * - Line breaks (<br>)
 * - Linkified URLs
 * - Twitter/X @mentions
 * - Twitter/X #hashtags
 */
export function formatDehypedTextHtml(text: string): string {
  if (!text) return '';

  const escaped = escapeHtml(text);

  // Regex for URLs
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
  // Regex for Twitter mentions: @username
  const mentionRegex = /(^|\s)@([a-zA-Z0-9_]{1,15})/g;
  // Regex for Twitter hashtags: #hashtag
  const hashtagRegex = /(^|\s)#([\p{L}\p{N}_]+)/gu;

  let formatted = escaped.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="dehype-entity-link dehype-url">${url}</a>`;
  });

  formatted = formatted.replace(mentionRegex, (match, prefix, username) => {
    return `${prefix}<a href="https://x.com/${username}" target="_blank" rel="noopener noreferrer" class="dehype-entity-link dehype-mention">@${username}</a>`;
  });

  formatted = formatted.replace(hashtagRegex, (match, prefix, tag) => {
    return `${prefix}<a href="https://x.com/hashtag/${tag}" target="_blank" rel="noopener noreferrer" class="dehype-entity-link dehype-hashtag">#${tag}</a>`;
  });

  // Preserve line breaks
  formatted = formatted.replace(/\r?\n/g, '<br>');

  return formatted;
}
