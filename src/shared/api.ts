import { DehypeApiRequest, DehypeApiResponse } from './types';

export const API_ENDPOINT = 'https://ai.insea.io/api/workflows/28777/run';
export const API_KEY_STORAGE_KEY = 'dehype_api_key';

export async function getApiKey(): Promise<string | null> {
  try {
    const res = await chrome.storage.sync.get(API_KEY_STORAGE_KEY);
    const key = res[API_KEY_STORAGE_KEY];
    if (typeof key === 'string' && key) {
      return key;
    }
  } catch {
    // Fallback to local if sync is unavailable
    try {
      const res = await chrome.storage.local.get(API_KEY_STORAGE_KEY);
      const key = res[API_KEY_STORAGE_KEY];
      if (typeof key === 'string' && key) {
        return key;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export async function setApiKey(apiKey: string): Promise<void> {
  const cleanKey = apiKey.trim();
  try {
    await chrome.storage.sync.set({ [API_KEY_STORAGE_KEY]: cleanKey });
  } catch {
    await chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: cleanKey });
  }
}

/**
 * Executes a batch request to the Dehype workflow API
 */
export async function runDehypeBatch(
  texts: string[],
  overrideApiKey?: string
): Promise<string[]> {
  const apiKey = overrideApiKey || (await getApiKey());
  if (!apiKey) {
    throw new Error('API key is not configured. Please open Dehype settings to set your key.');
  }

  if (!texts || texts.length === 0) {
    return [];
  }

  const payload: DehypeApiRequest = {
    texts,
  };

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errDetail = `${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) {
        errDetail = errJson.error.message;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(`API request failed: ${errDetail}`);
  }

  const resData: DehypeApiResponse = await response.json();

  if (resData.error && resData.error.message) {
    throw new Error(`API error (${resData.error.code || 'UNKNOWN'}): ${resData.error.message}`);
  }

  const workflowData = resData.data;
  if (!workflowData) {
    throw new Error('Invalid response structure from Dehype API (missing data field)');
  }

  if (workflowData.status && workflowData.status !== 'succeeded') {
    const nodeErr = workflowData.error?.message;
    throw new Error(`Workflow execution ${workflowData.status}: ${nodeErr || 'Operation could not complete'}`);
  }

  const outputs = workflowData.outputs;
  if (outputs?.results && Array.isArray(outputs.results)) {
    return outputs.results;
  }

  if (outputs?.result && typeof outputs.result === 'string') {
    return [outputs.result];
  }

  throw new Error('No dehyped results returned by the API');
}

/**
 * Tests whether the given API key is valid by sending a test ping
 */
export async function testApiKey(apiKey: string): Promise<boolean> {
  const testResults = await runDehypeBatch(['This is a groundbreaking revolutionary 100x game changer!'], apiKey);
  return Array.isArray(testResults) && testResults.length > 0;
}
