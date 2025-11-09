/**
 * Cookie options interface
 */
export interface CookieOptions {
    expires?: Date;
    maxAge?: number;
    domain?: string;
    path?: string;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
}
/**
 * Parsed cookie interface
 */
export interface Cookie {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: Date;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    httpOnly?: boolean;
}
/**
 * Local Storage item interface
 */
export interface LocalStorageItem {
    key: string;
    value: string;
    size: number;
}
/**
 * Session Storage item interface
 */
export interface SessionStorageItem {
    key: string;
    value: string;
    size: number;
}
/**
 * Cache Storage info interface
 */
export interface CacheInfo {
    name: string;
    entryCount: number;
    urls: string[];
}
/**
 * Cache entry interface
 */
export interface CacheEntry {
    url: string;
    method: string;
    headers: Record<string, string>;
    status: number;
    statusText: string;
    body?: string;
}
/**
 * Parse document.cookie and return array of cookie objects
 * Note: Can only read cookies that are accessible to JavaScript (not httpOnly)
 */
export declare function getAllCookies(): Cookie[];
/**
 * Get specific cookie value by name
 */
export declare function getCookie(name: string): string | null;
/**
 * Set cookie
 */
export declare function setCookie(name: string, value: string, options?: CookieOptions): void;
/**
 * Delete cookie
 */
export declare function deleteCookie(name: string, path?: string, domain?: string): void;
/**
 * Get all Local Storage items
 */
export declare function getAllLocalStorageItems(): LocalStorageItem[];
/**
 * Set Local Storage item
 */
export declare function setLocalStorageItem(key: string, value: string): void;
/**
 * Delete Local Storage item
 */
export declare function deleteLocalStorageItem(key: string): void;
/**
 * Clear all Local Storage
 */
export declare function clearLocalStorage(): void;
/**
 * Get total size of Local Storage in bytes
 */
export declare function getLocalStorageSize(): number;
/**
 * Get all Session Storage items
 */
export declare function getAllSessionStorageItems(): SessionStorageItem[];
/**
 * Set Session Storage item
 */
export declare function setSessionStorageItem(key: string, value: string): void;
/**
 * Delete Session Storage item
 */
export declare function deleteSessionStorageItem(key: string): void;
/**
 * Clear all Session Storage
 */
export declare function clearSessionStorage(): void;
/**
 * Get total size of Session Storage in bytes
 */
export declare function getSessionStorageSize(): number;
/**
 * Check if Cache Storage API is available
 */
export declare function isCacheStorageAvailable(): boolean;
/**
 * Get all Cache Storage caches
 */
export declare function getAllCaches(): Promise<CacheInfo[]>;
/**
 * Delete a cache
 */
export declare function deleteCache(cacheName: string): Promise<void>;
/**
 * Get all entries in a cache
 */
export declare function getCacheEntries(cacheName: string): Promise<CacheEntry[]>;
/**
 * Delete a specific cache entry
 */
export declare function deleteCacheEntry(cacheName: string, url: string): Promise<void>;
/**
 * Format bytes to human-readable string
 */
export declare function formatBytes(bytes: number): string;
/**
 * Try to parse JSON and return formatted string, or return original string
 */
export declare function formatJSON(value: string): string;
