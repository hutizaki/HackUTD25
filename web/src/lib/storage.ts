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
  httpOnly?: boolean; // Note: Can't read from JS, will be false/undefined
}

/**
 * Local Storage item interface
 */
export interface LocalStorageItem {
  key: string;
  value: string;
  size: number; // Size in bytes
}

/**
 * Session Storage item interface
 */
export interface SessionStorageItem {
  key: string;
  value: string;
  size: number; // Size in bytes
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
export function getAllCookies(): Cookie[] {
  if (!document.cookie) {
    return [];
  }

  const cookies: Cookie[] = [];
  const cookieStrings = document.cookie.split(';');

  for (const cookieString of cookieStrings) {
    const trimmed = cookieString.trim();
    if (!trimmed) continue;

    const [name, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('='); // Handle values that contain '='

    if (name) {
      cookies.push({
        name: name.trim(),
        value: decodeURIComponent(value || ''),
        // Note: domain, path, expires, secure, sameSite, httpOnly
        // cannot be read from document.cookie in JavaScript
        // They are only available when setting cookies
      });
    }
  }

  return cookies;
}

/**
 * Get specific cookie value by name
 */
export function getCookie(name: string): string | null {
  const cookies = getAllCookies();
  const cookie = cookies.find((c) => c.name === name);
  return cookie ? cookie.value : null;
}

/**
 * Set cookie
 */
export function setCookie(name: string, value: string, options?: CookieOptions): void {
  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (options) {
    if (options.expires) {
      cookieString += `; expires=${options.expires.toUTCString()}`;
    }
    if (options.maxAge) {
      cookieString += `; max-age=${options.maxAge}`;
    }
    if (options.domain) {
      cookieString += `; domain=${options.domain}`;
    }
    if (options.path) {
      cookieString += `; path=${options.path}`;
    }
    if (options.secure) {
      cookieString += '; secure';
    }
    if (options.sameSite) {
      cookieString += `; samesite=${options.sameSite}`;
    }
  }

  document.cookie = cookieString;
}

/**
 * Delete cookie
 */
export function deleteCookie(name: string, path?: string, domain?: string): void {
  let cookieString = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC`;

  if (path) {
    cookieString += `; path=${path}`;
  }
  if (domain) {
    cookieString += `; domain=${domain}`;
  }

  document.cookie = cookieString;
}

/**
 * Get all Local Storage items
 */
export function getAllLocalStorageItems(): LocalStorageItem[] {
  const items: LocalStorageItem[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key) || '';
      const size = new Blob([value]).size;
      items.push({ key, value, size });
    }
  }
  
  return items;
}

/**
 * Set Local Storage item
 */
export function setLocalStorageItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error('Local Storage quota exceeded');
    }
    throw error;
  }
}

/**
 * Delete Local Storage item
 */
export function deleteLocalStorageItem(key: string): void {
  localStorage.removeItem(key);
}

/**
 * Clear all Local Storage
 */
export function clearLocalStorage(): void {
  localStorage.clear();
}

/**
 * Get total size of Local Storage in bytes
 */
export function getLocalStorageSize(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key) || '';
      total += new Blob([key + value]).size;
    }
  }
  return total;
}

/**
 * Get all Session Storage items
 */
export function getAllSessionStorageItems(): SessionStorageItem[] {
  const items: SessionStorageItem[] = [];
  
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key) {
      const value = sessionStorage.getItem(key) || '';
      const size = new Blob([value]).size;
      items.push({ key, value, size });
    }
  }
  
  return items;
}

/**
 * Set Session Storage item
 */
export function setSessionStorageItem(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error('Session Storage quota exceeded');
    }
    throw error;
  }
}

/**
 * Delete Session Storage item
 */
export function deleteSessionStorageItem(key: string): void {
  sessionStorage.removeItem(key);
}

/**
 * Clear all Session Storage
 */
export function clearSessionStorage(): void {
  sessionStorage.clear();
}

/**
 * Get total size of Session Storage in bytes
 */
export function getSessionStorageSize(): number {
  let total = 0;
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key) {
      const value = sessionStorage.getItem(key) || '';
      total += new Blob([key + value]).size;
    }
  }
  return total;
}

/**
 * Check if Cache Storage API is available
 */
export function isCacheStorageAvailable(): boolean {
  return 'caches' in window;
}

/**
 * Get all Cache Storage caches
 */
export async function getAllCaches(): Promise<CacheInfo[]> {
  if (!isCacheStorageAvailable()) {
    throw new Error('Cache Storage API is not available');
  }

  const cacheNames = await caches.keys();
  const cacheInfos: CacheInfo[] = [];

  for (const cacheName of cacheNames) {
    try {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      const urls = requests.map((req) => req.url);
      cacheInfos.push({
        name: cacheName,
        entryCount: requests.length,
        urls,
      });
    } catch (error) {
      // Skip caches that can't be opened
      console.warn(`Failed to open cache: ${cacheName}`, error);
    }
  }

  return cacheInfos;
}

/**
 * Delete a cache
 */
export async function deleteCache(cacheName: string): Promise<void> {
  if (!isCacheStorageAvailable()) {
    throw new Error('Cache Storage API is not available');
  }

  await caches.delete(cacheName);
}

/**
 * Get all entries in a cache
 */
export async function getCacheEntries(cacheName: string): Promise<CacheEntry[]> {
  if (!isCacheStorageAvailable()) {
    throw new Error('Cache Storage API is not available');
  }

  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  const entries: CacheEntry[] = [];

  for (const request of requests) {
    try {
      const response = await cache.match(request);
      if (response) {
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        let body: string | undefined;
        try {
          body = await response.clone().text();
        } catch {
          // Body might not be readable as text
          body = undefined;
        }

        entries.push({
          url: request.url,
          method: request.method || 'GET',
          headers,
          status: response.status,
          statusText: response.statusText,
          body,
        });
      }
    } catch (error) {
      console.warn(`Failed to get entry for ${request.url}`, error);
    }
  }

  return entries;
}

/**
 * Delete a specific cache entry
 */
export async function deleteCacheEntry(cacheName: string, url: string): Promise<void> {
  if (!isCacheStorageAvailable()) {
    throw new Error('Cache Storage API is not available');
  }

  const cache = await caches.open(cacheName);
  await cache.delete(url);
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Try to parse JSON and return formatted string, or return original string
 */
export function formatJSON(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}
