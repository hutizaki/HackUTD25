/**
 * Type definitions for network monitoring
 */

/**
 * HTTP Method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Network request log entry
 */
export interface NetworkLog {
  id: string;
  method: HttpMethod;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  responseTime?: number; // in milliseconds
  timestamp: number; // Unix timestamp in milliseconds
  error?: string;
  queryParams?: Record<string, string>;
}

/**
 * Network log filter options
 */
export interface NetworkLogFilter {
  method?: HttpMethod | 'ALL';
  statusCode?: number | 'ALL';
  searchText?: string;
}

/**
 * Network interceptor configuration
 */
export interface NetworkInterceptorConfig {
  maxEntries?: number; // Maximum number of logs to store (default: 100)
  enabled?: boolean; // Whether interceptor is enabled (default: true)
}

