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
