/**
 * Network Interceptor
 *
 * Intercepts and logs all network requests made by the application.
 * Provides filtering and search capabilities for network logs.
 */
import type { NetworkLog, NetworkLogFilter, NetworkInterceptorConfig } from '../types/network';
/**
 * Network interceptor class
 */
declare class NetworkInterceptor {
    private logs;
    private config;
    private listeners;
    private logIdCounter;
    /**
     * Initialize the interceptor
     */
    init(config?: NetworkInterceptorConfig): void;
    /**
     * Setup fetch and XHR interceptors
     */
    private setupInterceptors;
    /**
     * Parse headers from various formats
     */
    private parseHeaders;
    /**
     * Parse request/response body
     */
    private parseBody;
    /**
     * Parse query parameters from URL
     */
    private parseQueryParams;
    /**
     * Generate unique log ID
     */
    private generateLogId;
    /**
     * Add a log entry
     */
    private addLog;
    /**
     * Get all logs
     */
    getLogs(): NetworkLog[];
    /**
     * Get filtered logs
     */
    getFilteredLogs(filter: NetworkLogFilter): NetworkLog[];
    /**
     * Clear all logs
     */
    clearLogs(): void;
    /**
     * Enable interceptor
     */
    enable(): void;
    /**
     * Disable interceptor
     */
    disable(): void;
    /**
     * Check if interceptor is enabled
     */
    isEnabled(): boolean;
    /**
     * Subscribe to log updates
     */
    subscribe(listener: (logs: NetworkLog[]) => void): () => void;
    /**
     * Notify all listeners
     */
    private notifyListeners;
    /**
     * Get singleton instance
     */
    private static instance;
    static getInstance(): NetworkInterceptor;
}
/**
 * Export singleton instance
 */
export declare const networkInterceptor: NetworkInterceptor;
/**
 * Initialize network interceptor (should be called early in app lifecycle)
 */
export declare function initNetworkInterceptor(config?: NetworkInterceptorConfig): void;
export {};
