import assert from 'node:assert';
import test from 'node:test';
import { countWords, MIN_WORDS_TO_DEHYPE } from '../src/shared/text.ts';

test('countWords: English tweets', () => {
  // Empty / whitespace
  assert.strictEqual(countWords(''), 0);
  assert.strictEqual(countWords('   \n\t  '), 0);

  // Short English tweet (4 words)
  const shortEn = 'Just testing our app!';
  assert.strictEqual(countWords(shortEn), 4);
  assert.strictEqual(countWords(shortEn) > MIN_WORDS_TO_DEHYPE, false);

  // Exactly 10 English words
  const tenWords = 'One two three four five six seven eight nine ten';
  assert.strictEqual(countWords(tenWords), 10);
  assert.strictEqual(countWords(tenWords) > MIN_WORDS_TO_DEHYPE, false);

  // Exactly 11 English words (should be dehyped)
  const elevenWords = 'One two three four five six seven eight nine ten eleven';
  assert.strictEqual(countWords(elevenWords), 11);
  assert.strictEqual(countWords(elevenWords) > MIN_WORDS_TO_DEHYPE, true);

  // English tweet with punctuation and contractions
  const longEn = "Don't worry, we're definitely going to launch this brand new product tomorrow morning!";
  assert.strictEqual(countWords(longEn) > MIN_WORDS_TO_DEHYPE, true);
});

test('countWords: Chinese tweets', () => {
  // Short Chinese tweets (<= 10 words)
  const shortZh1 = '太牛了！';
  assert.strictEqual(countWords(shortZh1) <= MIN_WORDS_TO_DEHYPE, true);

  const shortZh2 = '今天天气真好，去公园散步了。';
  assert.strictEqual(countWords(shortZh2) <= MIN_WORDS_TO_DEHYPE, true);

  const shortZh3 = '今天天气真好，我想出去散步买咖啡吃蛋糕。'; // exactly 10 words
  assert.strictEqual(countWords(shortZh3), 10);
  assert.strictEqual(countWords(shortZh3) > MIN_WORDS_TO_DEHYPE, false);

  // Long Chinese tweets (> 10 words)
  const longZh1 = '今天天气真好，我想出去散步买咖啡吃蛋糕看电影。'; // 12 words
  assert.strictEqual(countWords(longZh1), 12);
  assert.strictEqual(countWords(longZh1) > MIN_WORDS_TO_DEHYPE, true);

  const longZh2 = '重磅！GPT-5 正式发布了，这是人工智能历史上最伟大的时刻！';
  assert.strictEqual(countWords(longZh2) > MIN_WORDS_TO_DEHYPE, true);
});

test('countWords: Mixed English & Chinese tweets', () => {
  const shortMixed = 'Claude 3.5 Sonnet 太强了！';
  assert.strictEqual(countWords(shortMixed) <= MIN_WORDS_TO_DEHYPE, true);

  const longMixed = '刚刚试用了 Claude 3.5 Sonnet，编程能力真的太强了，彻底震撼到我了！';
  assert.strictEqual(countWords(longMixed) > MIN_WORDS_TO_DEHYPE, true);
});

test('countWords: URLs do not artificially inflate word count', () => {
  // A short tweet with a long URL should not exceed 10 words
  const tweetWithLongUrl = 'Check this out: https://example.com/2026/10/13/how-to-build-a-fast-ai-app-in-python';
  assert.strictEqual(countWords(tweetWithLongUrl), 3);
  assert.strictEqual(countWords(tweetWithLongUrl) > MIN_WORDS_TO_DEHYPE, false);

  const zhTweetWithLongUrl = '必须看：https://example.com/very/long/path/with/lots/of/words/in/the/url';
  assert.strictEqual(countWords(zhTweetWithLongUrl) <= MIN_WORDS_TO_DEHYPE, true);
});
