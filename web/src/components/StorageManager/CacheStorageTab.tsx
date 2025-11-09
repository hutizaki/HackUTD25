import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  getAllCaches,
  deleteCache,
  getCacheEntries,
  deleteCacheEntry,
  isCacheStorageAvailable,
  type CacheInfo,
  type CacheEntry,
} from '@/lib/storage';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { handleApiError } from '@/lib/errorHandling';

interface CacheStorageTabProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function CacheStorageTab({ searchTerm, onSearchChange }: CacheStorageTabProps) {
  const [caches, setCaches] = useState<CacheInfo[]>([]);
  const [selectedCache, setSelectedCache] = useState<string | null>(null);
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCacheStorageAvailable()) {
      loadCaches();
    }
  }, []);

  const loadCaches = async () => {
    try {
      setLoading(true);
      setError(null);
      const cachesList = await getAllCaches();
      setCaches(cachesList);
    } catch (err) {
      setError(handleApiError(err, 'Failed to load caches'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCache = async (cacheName: string) => {
    try {
      setLoading(true);
      setError(null);
      const entries = await getCacheEntries(cacheName);
      setCacheEntries(entries);
      setSelectedCache(cacheName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cache entries');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCache = async (cacheName: string) => {
    if (confirm(`Are you sure you want to delete the cache "${cacheName}"?`)) {
      try {
        await deleteCache(cacheName);
        if (selectedCache === cacheName) {
          setSelectedCache(null);
          setCacheEntries([]);
        }
        loadCaches();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete cache');
        setTimeout(() => setError(null), 3000);
      }
    }
  };

  const handleDeleteEntry = async (cacheName: string, url: string) => {
    if (confirm(`Are you sure you want to delete this cache entry?`)) {
      try {
        await deleteCacheEntry(cacheName, url);
        if (selectedCache === cacheName) {
          handleOpenCache(cacheName);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete cache entry');
        setTimeout(() => setError(null), 3000);
      }
    }
  };

  const filteredCaches = caches.filter((cache) =>
    cache.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cache.urls.some((url) => url.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isCacheStorageAvailable()) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-6 text-center">
        <p className="text-yellow-800 dark:text-yellow-300 font-semibold mb-2">Cache Storage API Not Available</p>
        <p className="text-yellow-700 dark:text-yellow-400 text-sm">
          Cache Storage requires service worker support and may not be available in all browsers or contexts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <ErrorDisplay error={error} className="text-sm" />}

      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by cache name or URL..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="flex items-center space-x-2">
          {selectedCache && (
            <button
              onClick={() => {
                setSelectedCache(null);
                setCacheEntries([]);
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm transition-colors"
            >
              ← Back to Caches
            </button>
          )}
          <button
            onClick={loadCaches}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm transition-colors disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="sm" />
        </div>
      )}

      {!loading && !selectedCache && (
        <>
          {/* Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-sm">
            <span className="text-blue-800 dark:text-blue-300">
              <strong>{caches.length}</strong> cache{caches.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Caches List */}
          {filteredCaches.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {searchTerm ? `No caches found matching "${searchTerm}"` : 'No caches found'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCaches.map((cache) => (
                <motion.div
                  key={cache.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white text-lg mb-1">{cache.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {cache.entryCount} entr{cache.entryCount !== 1 ? 'ies' : 'y'}
                      </div>
                      {cache.urls.length > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 max-h-20 overflow-y-auto">
                          {cache.urls.slice(0, 5).map((url, idx) => (
                            <div key={idx} className="truncate" title={url}>
                              {url}
                            </div>
                          ))}
                          {cache.urls.length > 5 && (
                            <div className="text-gray-400">... and {cache.urls.length - 5} more</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleOpenCache(cache.name)}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleDeleteCache(cache.name)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Cache Entries View */}
      {selectedCache && !loading && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-sm">
            <span className="text-blue-800 dark:text-blue-300">
              Cache: <strong>{selectedCache}</strong> • {cacheEntries.length} entr{cacheEntries.length !== 1 ? 'ies' : 'y'}
            </span>
          </div>

          {cacheEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No entries in this cache</div>
          ) : (
            <div className="space-y-2">
              {cacheEntries.map((entry, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1 break-all">{entry.url}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Method: {entry.method} • Status: {entry.status} {entry.statusText}
                      </div>
                      {entry.body && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 break-all font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded max-h-32 overflow-y-auto">
                          <pre className="whitespace-pre-wrap">{entry.body.substring(0, 500)}{entry.body.length > 500 ? '...' : ''}</pre>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleDeleteEntry(selectedCache, entry.url)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
