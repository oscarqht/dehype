export interface CacheEntry {
  id: string; // tweet ID or fallback hash
  originalText: string;
  dehypedText: string;
  timestamp: number;
}

export interface CacheStore {
  entries: Record<string, CacheEntry>;
  order: string[]; // LRU order, most recent at the end
}

export interface DehypeApiRequest {
  text?: string;
  texts: string[];
}

export interface DehypeApiResponse {
  request_id?: string;
  data?: {
    status?: string;
    inputs?: {
      text?: string;
      texts?: string[] | null;
    };
    outputs?: {
      result?: string;
      results?: string[];
    };
    error?: {
      code?: string;
      message?: string;
    };
  };
  error?: {
    code?: string;
    message?: string;
  };
}

export type ExtensionMessage =
  | { type: 'CHECK_API_KEY' }
  | { type: 'DEHYPE_BATCH'; texts: string[] }
  | { type: 'TEST_API_KEY'; apiKey: string }
  | { type: 'GET_CACHE_STATS' }
  | { type: 'CLEAR_CACHE' };

export type ExtensionResponse =
  | { success: true; apiKeyConfigured: boolean }
  | { success: true; results: string[] }
  | { success: true; stats: { count: number; maxSize: number } }
  | { success: true; message?: string }
  | { success: false; error: string; details?: unknown };
