/**
 * Network Interceptor
 * 
 * Intercepts and logs all network requests made by the application.
 * Provides filtering and search capabilities for network logs.
 */

import type { NetworkLog, NetworkLogFilter, NetworkInterceptorConfig, HttpMethod } from '../types/network';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<NetworkInterceptorConfig> = {
  maxEntries: 100,
  enabled: true,
};

/**
 * Network interceptor class
 */
class NetworkInterceptor {
  private logs: NetworkLog[] = [];
  private config: Required<NetworkInterceptorConfig> = DEFAULT_CONFIG;
  private listeners: Set<(logs: NetworkLog[]) => void> = new Set();
  private logIdCounter = 0;

  /**
   * Initialize the interceptor
   */
  init(config?: NetworkInterceptorConfig): void {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupInterceptors();
  }

  /**
   * Setup fetch and XHR interceptors
   */
  private setupInterceptors(): void {
    if (!this.config.enabled) {
      return;
    }

    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const [input, init] = args;
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const method = (init?.method as HttpMethod) || 'GET';
      const headers = this.parseHeaders(init?.headers);
      const body = init?.body ? this.parseBody(init.body) : undefined;

      const logId = this.generateLogId();
      const startTime = Date.now();

      // Create request log
      const log: NetworkLog = {
        id: logId,
        method: method as HttpMethod,
        url,
        requestHeaders: headers,
        requestBody: body,
        timestamp: startTime,
        queryParams: this.parseQueryParams(url),
      };

      try {
        const response = await originalFetch(...args);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Clone response to read body without consuming it
        const clonedResponse = response.clone();

        // Read response body
        let responseBody: unknown;
        const contentType = response.headers.get('content-type') || '';
        try {
          if (contentType.includes('application/json')) {
            responseBody = await clonedResponse.json();
          } else if (contentType.includes('text/')) {
            responseBody = await clonedResponse.text();
          } else {
            // For other types, try to read as text
            responseBody = await clonedResponse.text();
          }
        } catch {
          // If we can't parse the body, just store the response object info
          responseBody = { _unparseable: true };
        }

        // Update log with response data
        log.responseStatus = response.status;
        log.responseHeaders = this.parseHeaders(response.headers);
        log.responseBody = responseBody;
        log.responseTime = responseTime;

        this.addLog(log);
        return response;
      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        log.error = error instanceof Error ? error.message : String(error);
        log.responseTime = responseTime;

        this.addLog(log);
        throw error;
      }
    };

    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null
    ) {
      const urlString = typeof url === 'string' ? url : url.toString();
      (this as unknown as { _networkLogId?: string; _networkLog?: NetworkLog })._networkLogId =
        NetworkInterceptor.getInstance().generateLogId();
      (this as unknown as { _networkLog?: NetworkLog })._networkLog = {
        id: (this as unknown as { _networkLogId?: string })._networkLogId!,
        method: method as HttpMethod,
        url: urlString,
        requestHeaders: {},
        timestamp: Date.now(),
        queryParams: NetworkInterceptor.getInstance().parseQueryParams(urlString),
      };
      return originalXHROpen.call(this, method, url, async ?? true, username ?? null, password ?? null);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      const log = (this as unknown as { _networkLog?: NetworkLog })._networkLog;
      if (log) {
        log.requestBody = body ? NetworkInterceptor.getInstance().parseBody(body) : undefined;
        log.requestHeaders = this.getAllResponseHeaders
          ? NetworkInterceptor.getInstance().parseHeaders(this.getAllResponseHeaders())
          : {};

        const startTime = Date.now();
        const originalOnReadyStateChange = this.onreadystatechange;

        this.onreadystatechange = function () {
          if (this.readyState === XMLHttpRequest.DONE) {
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            log.responseStatus = this.status;
            log.responseHeaders = this.getAllResponseHeaders
              ? NetworkInterceptor.getInstance().parseHeaders(this.getAllResponseHeaders())
              : {};
            log.responseTime = responseTime;

            try {
              const contentType = this.getResponseHeader('content-type') || '';
              if (contentType.includes('application/json')) {
                log.responseBody = JSON.parse(this.responseText);
              } else {
                log.responseBody = this.responseText;
              }
            } catch {
              log.responseBody = { _unparseable: true };
            }

            if (this.status >= 400) {
              log.error = `HTTP ${this.status}`;
            }

            NetworkInterceptor.getInstance().addLog(log);
          }

          if (originalOnReadyStateChange) {
            (originalOnReadyStateChange as (this: XMLHttpRequest) => void).call(this);
          }
        };
      }

      return originalXHRSend.call(this, body);
    };
  }

  /**
   * Parse headers from various formats
   */
  private parseHeaders(headers?: HeadersInit | string): Record<string, string> {
    if (!headers) {
      return {};
    }

    if (typeof headers === 'string') {
      // Parse header string (e.g., "Content-Type: application/json\nAuthorization: Bearer token")
      const result: Record<string, string> = {};
      headers.split('\n').forEach((line) => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          result[key.trim()] = valueParts.join(':').trim();
        }
      });
      return result;
    }

    if (headers instanceof Headers) {
      const result: Record<string, string> = {};
      headers.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }

    if (Array.isArray(headers)) {
      const result: Record<string, string> = {};
      headers.forEach(([key, value]) => {
        result[key] = value;
      });
      return result;
    }

    // Assume it's a Record<string, string>
    return headers as Record<string, string>;
  }

  /**
   * Parse request/response body
   */
  private parseBody(body: BodyInit | Document | null): unknown {
    if (!body) {
      return undefined;
    }

    if (typeof body === 'string') {
      try {
        return JSON.parse(body);
      } catch {
        return body;
      }
    }

    if (body instanceof FormData) {
      const result: Record<string, unknown> = {};
      body.forEach((value, key) => {
        result[key] = value instanceof File ? { _file: value.name, _size: value.size } : value;
      });
      return result;
    }

    if (body instanceof URLSearchParams) {
      const result: Record<string, string> = {};
      body.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }

    if (body instanceof Blob) {
      return { _blob: body.type, _size: body.size };
    }

    if (body instanceof ArrayBuffer) {
      return { _arrayBuffer: true, _size: body.byteLength };
    }

    // For other types, return as-is or stringify
    try {
      return JSON.parse(JSON.stringify(body));
    } catch {
      return { _unparseable: true };
    }
  }

  /**
   * Parse query parameters from URL
   */
  private parseQueryParams(url: string): Record<string, string> {
    try {
      const urlObj = new URL(url, window.location.origin);
      const params: Record<string, string> = {};
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      return params;
    } catch {
      return {};
    }
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    this.logIdCounter += 1;
    return `log-${Date.now()}-${this.logIdCounter}`;
  }

  /**
   * Add a log entry
   */
  private addLog(log: NetworkLog): void {
    if (!this.config.enabled) {
      return;
    }

    this.logs.unshift(log); // Add to beginning

    // Maintain max entries limit (circular buffer)
    if (this.logs.length > this.config.maxEntries) {
      this.logs = this.logs.slice(0, this.config.maxEntries);
    }

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Get all logs
   */
  getLogs(): NetworkLog[] {
    return [...this.logs];
  }

  /**
   * Get filtered logs
   */
  getFilteredLogs(filter: NetworkLogFilter): NetworkLog[] {
    let filtered = [...this.logs];

    // Filter by method
    if (filter.method && filter.method !== 'ALL') {
      filtered = filtered.filter((log) => log.method === filter.method);
    }

    // Filter by status code
    if (filter.statusCode && filter.statusCode !== 'ALL') {
      filtered = filtered.filter((log) => log.responseStatus === filter.statusCode);
    }

    // Filter by search text (searches in URL)
    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      filtered = filtered.filter((log) => log.url.toLowerCase().includes(searchLower));
    }

    return filtered;
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.notifyListeners();
  }

  /**
   * Enable interceptor
   */
  enable(): void {
    this.config.enabled = true;
    this.setupInterceptors();
  }

  /**
   * Disable interceptor
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * Check if interceptor is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Subscribe to log updates
   */
  subscribe(listener: (logs: NetworkLog[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const logs = this.getLogs();
    this.listeners.forEach((listener) => {
      try {
        listener(logs);
      } catch (error) {
        console.error('Error in network interceptor listener:', error);
      }
    });
  }

  /**
   * Get singleton instance
   */
  private static instance: NetworkInterceptor | null = null;

  static getInstance(): NetworkInterceptor {
    if (!NetworkInterceptor.instance) {
      NetworkInterceptor.instance = new NetworkInterceptor();
    }
    return NetworkInterceptor.instance;
  }
}

/**
 * Export singleton instance
 */
export const networkInterceptor = NetworkInterceptor.getInstance();

/**
 * Initialize network interceptor (should be called early in app lifecycle)
 */
export function initNetworkInterceptor(config?: NetworkInterceptorConfig): void {
  networkInterceptor.init(config);
}

