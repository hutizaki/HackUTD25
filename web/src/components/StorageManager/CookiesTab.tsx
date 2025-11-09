import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAllCookies, deleteCookie, setCookie, type Cookie, type CookieOptions } from '@/lib/cookies';
import { getHttpOnlyCookies, type HttpOnlyCookie } from '@/lib/admin';

interface CookiesTabProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

interface EditingCookieState {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export function CookiesTab({ searchTerm, onSearchChange }: CookiesTabProps) {
  const [cookies, setCookies] = useState<Cookie[]>([]);
  const [httpOnlyCookies, setHttpOnlyCookies] = useState<HttpOnlyCookie[]>([]);
  const [loadingHttpOnly, setLoadingHttpOnly] = useState(false);
  const [editingCookie, setEditingCookie] = useState<string | null>(null);
  const [editingState, setEditingState] = useState<EditingCookieState | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCookie, setNewCookie] = useState<EditingCookieState>({
    name: '',
    value: '',
    path: '/',
    sameSite: 'Lax',
  });
  const [copiedCookie, setCopiedCookie] = useState<string | null>(null);

  useEffect(() => {
    loadCookies();
    loadHttpOnlyCookies();
  }, []);

  const loadCookies = () => {
    setCookies(getAllCookies());
  };

  const loadHttpOnlyCookies = async () => {
    try {
      setLoadingHttpOnly(true);
      const response = await getHttpOnlyCookies();
      setHttpOnlyCookies(response.data);
    } catch (err) {
      // Silently fail - HttpOnly cookies may not be available in all environments
      console.error('Failed to load HttpOnly cookies:', err);
      setHttpOnlyCookies([]);
    } finally {
      setLoadingHttpOnly(false);
    }
  };

  const handleDelete = (name: string) => {
    if (confirm(`Are you sure you want to delete the cookie "${name}"?`)) {
      deleteCookie(name);
      loadCookies();
    }
  };

  const handleEdit = (cookie: Cookie) => {
    setEditingCookie(cookie.name);
    setEditingState({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || '/',
      expires: cookie.expires ? new Date(cookie.expires).toISOString().slice(0, 16) : undefined,
      secure: cookie.secure,
      sameSite: cookie.sameSite || 'Lax',
    });
  };

  const handleSaveEdit = () => {
    if (!editingCookie || !editingState) return;
    
    const options: CookieOptions = {};
    if (editingState.domain) options.domain = editingState.domain;
    if (editingState.path) options.path = editingState.path;
    if (editingState.expires) options.expires = new Date(editingState.expires);
    if (editingState.secure) options.secure = true;
    if (editingState.sameSite) options.sameSite = editingState.sameSite;

    // Delete old cookie first if name changed
    if (editingState.name !== editingCookie) {
      deleteCookie(editingCookie);
    }

    setCookie(editingState.name, editingState.value, options);
    setEditingCookie(null);
    setEditingState(null);
    loadCookies();
  };

  const handleAddCookie = () => {
    if (!newCookie.name || !newCookie.value) {
      alert('Cookie name and value are required');
      return;
    }

    const options: CookieOptions = {};
    if (newCookie.domain) options.domain = newCookie.domain;
    if (newCookie.path) options.path = newCookie.path;
    if (newCookie.expires) options.expires = new Date(newCookie.expires);
    if (newCookie.secure) options.secure = true;
    if (newCookie.sameSite) options.sameSite = newCookie.sameSite;

    setCookie(newCookie.name, newCookie.value, options);
    setNewCookie({ name: '', value: '', path: '/', sameSite: 'Lax' });
    setShowAddForm(false);
    loadCookies();
  };

  const handleCopyValue = (name: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedCookie(name);
    setTimeout(() => setCopiedCookie(null), 2000);
  };

  const filteredCookies = cookies.filter((cookie) =>
    cookie.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cookie.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredHttpOnlyCookies = httpOnlyCookies.filter((cookie) =>
    cookie.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cookie.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">

      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search cookies..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm transition-colors"
          >
            {showAddForm ? 'Cancel' : '+ Add Cookie'}
          </button>
          <button
            onClick={() => {
              loadCookies();
              loadHttpOnlyCookies();
            }}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-sm">
        <span className="text-blue-800 dark:text-blue-300">
          <strong>{cookies.length}</strong> JavaScript-accessible cookie{cookies.length !== 1 ? 's' : ''}
          {httpOnlyCookies.length > 0 && (
            <> • <strong>{httpOnlyCookies.length}</strong> HttpOnly cookie{httpOnlyCookies.length !== 1 ? 's' : ''}</>
          )}
        </span>
      </div>

      {/* Add Cookie Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm"
        >
          <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Add New Cookie</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input
                type="text"
                value={newCookie.name}
                onChange={(e) => setNewCookie({ ...newCookie, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                placeholder="cookie-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
              <input
                type="text"
                value={newCookie.value}
                onChange={(e) => setNewCookie({ ...newCookie, value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                placeholder="cookie-value"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                <input
                  type="text"
                  value={newCookie.domain || ''}
                  onChange={(e) => setNewCookie({ ...newCookie, domain: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                  placeholder="example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Path</label>
                <input
                  type="text"
                  value={newCookie.path || '/'}
                  onChange={(e) => setNewCookie({ ...newCookie, path: e.target.value || '/' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                  placeholder="/"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires</label>
                <input
                  type="datetime-local"
                  value={newCookie.expires || ''}
                  onChange={(e) => setNewCookie({ ...newCookie, expires: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SameSite</label>
                <select
                  value={newCookie.sameSite || 'Lax'}
                  onChange={(e) => setNewCookie({ ...newCookie, sameSite: e.target.value as 'Strict' | 'Lax' | 'None' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="Strict">Strict</option>
                  <option value="Lax">Lax</option>
                  <option value="None">None</option>
                </select>
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="new-secure"
                checked={newCookie.secure || false}
                onChange={(e) => setNewCookie({ ...newCookie, secure: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="new-secure" className="text-sm text-gray-700 dark:text-gray-300">Secure (HTTPS only)</label>
            </div>
            <button
              onClick={handleAddCookie}
              className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm transition-colors"
            >
              Add Cookie
            </button>
          </div>
        </motion.div>
      )}

      {/* JavaScript-Accessible Cookies Section */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">JavaScript-Accessible Cookies</h3>
        {filteredCookies.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchTerm ? `No JavaScript-accessible cookies found matching "${searchTerm}"` : 'No JavaScript-accessible cookies found'}
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Showing {filteredCookies.length} of {cookies.length} cookie{cookies.length !== 1 ? 's' : ''}
            </div>
            {filteredCookies.map((cookie) => (
            <motion.div
              key={cookie.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              {editingCookie === cookie.name && editingState ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                    <input
                      type="text"
                      value={editingState.name}
                      onChange={(e) => setEditingState({ ...editingState, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                    <textarea
                      value={editingState.value}
                      onChange={(e) => setEditingState({ ...editingState, value: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                      <input
                        type="text"
                        value={editingState.domain || ''}
                        onChange={(e) => setEditingState({ ...editingState, domain: e.target.value || undefined })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Path</label>
                      <input
                        type="text"
                        value={editingState.path || '/'}
                        onChange={(e) => setEditingState({ ...editingState, path: e.target.value || '/' })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => {
                        setEditingCookie(null);
                        setEditingState(null);
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white text-lg mb-1">{cookie.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 break-all font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        {cookie.value}
                      </div>
                      {cookie.domain && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span className="font-medium">Domain:</span> {cookie.domain}
                        </div>
                      )}
                      {cookie.path && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium">Path:</span> {cookie.path}
                        </div>
                      )}
                      {cookie.expires && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium">Expires:</span> {new Date(cookie.expires).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleCopyValue(cookie.name, cookie.value)}
                        className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                        title="Copy value"
                      >
                        {copiedCookie === cookie.name ? '✓ Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleEdit(cookie)}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cookie.name)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
          </>
        )}
      </div>

      {/* HttpOnly Cookies Section */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">HttpOnly Cookies</h3>
        {loadingHttpOnly ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Loading HttpOnly cookies...
          </div>
        ) : filteredHttpOnlyCookies.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchTerm ? `No HttpOnly cookies found matching "${searchTerm}"` : 'No HttpOnly cookies found'}
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Showing {filteredHttpOnlyCookies.length} of {httpOnlyCookies.length} cookie{httpOnlyCookies.length !== 1 ? 's' : ''}
            </div>
            {filteredHttpOnlyCookies.map((cookie) => (
              <motion.div
                key={cookie.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white text-lg mb-1">{cookie.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 break-all font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        {cookie.value}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span className="font-medium">HttpOnly:</span> Yes (read-only)
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleCopyValue(cookie.name, cookie.value)}
                        className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                        title="Copy value"
                      >
                        {copiedCookie === cookie.name ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
