export interface CacheEntry {
  id: string; // tweet ID or fallback hash
  originalText: string;
  dehypedText: string;
  isHype?: boolean;
  timestamp: number;
}

export interface CacheStore {
  entries: Record<string, CacheEntry>;
  order: string[]; // LRU order, most recent at the end
}

export interface DehypeApiRequest {
  text: string;
}

export interface DehypeResult {
  result: string;
  isHype: boolean;
}

export interface DehypeApiNodeExecution {
  id: string;
  status: string;
  duration_ms?: number;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  error?: {
    code?: string;
    message?: string;
  };
}

export interface DehypeApiResponse {
  request_id?: string;
  data?: {
    status?: string;
    inputs?: {
      text?: string;
    };
    outputs?: {
      result?: string;
      isHype?: boolean;
    };
    attachment_ids?: string[];
    executed_nodes?: DehypeApiNodeExecution[];
    elapsed_time_ms?: number;
    started_at?: number;
    finished_at?: number;
    usage?: {
      input_tokens: number;
      output_tokens: number;
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
  | { type: 'DEHYPE_TEXT'; text: string }
  | { type: 'TEST_API_KEY'; apiKey: string }
  | { type: 'GET_CACHE_STATS' }
  | { type: 'CLEAR_CACHE' };

export type ExtensionResponse =
  | { success: true; apiKeyConfigured: boolean }
  | { success: true; data: DehypeResult }
  | { success: true; stats: { count: number; maxSize: number } }
  | { success: true; message?: string }
  | { success: false; error: string; details?: unknown };
