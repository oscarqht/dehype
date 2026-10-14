import assert from 'node:assert';
import test from 'node:test';
import { runDehype, API_ENDPOINT } from '../src/shared/api.ts';

test('runDehype: sends single text payload and parses result + isHype', async () => {
  const originalFetch = globalThis.fetch;
  try {
    let capturedUrl = '';
    let capturedInit;
    globalThis.fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return new Response(
        JSON.stringify({
          request_id: 'req_123456',
          data: {
            status: 'succeeded',
            inputs: { text: 'Hyped tweet!' },
            outputs: {
              result: 'Calm tweet.',
              isHype: true,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const res = await runDehype('Hyped tweet!', 'test_key');
    assert.strictEqual(capturedUrl, API_ENDPOINT);
    assert.strictEqual(capturedInit.method, 'POST');
    assert.deepStrictEqual(JSON.parse(capturedInit.body), { text: 'Hyped tweet!' });
    assert.deepStrictEqual(res, { result: 'Calm tweet.', isHype: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('runDehype: handles non-hype response and top-level/node errors', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          request_id: 'req_123456',
          data: {
            status: 'succeeded',
            inputs: { text: 'Normal tweet' },
            outputs: {
              result: '',
              isHype: false,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const nonHype = await runDehype('Normal tweet', 'test_key');
    assert.deepStrictEqual(nonHype, { result: '', isHype: false });

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          request_id: 'req_123456',
          error: {
            code: 'NODE_EXECUTION_ERROR',
            message: 'model xxx is not supported',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    await assert.rejects(
      () => runDehype('Normal tweet', 'test_key'),
      /API error \(NODE_EXECUTION_ERROR\): model xxx is not supported/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
