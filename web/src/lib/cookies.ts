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

