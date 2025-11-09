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
