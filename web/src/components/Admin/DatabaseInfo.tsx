import { useState, useEffect } from 'react';
import { getStats, type DatabaseStatsResponse } from '@/lib/admin';
import { CollectionModal } from './CollectionModal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { handleApiError } from '@/lib/errorHandling';

export function DatabaseInfo() {
  const [stats, setStats] = useState<DatabaseStatsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getStats();
      setStats(response.data);
    } catch (err) {
      if (err instanceof Error && err.message.includes('503')) {
        setError('Database not connected');
      } else {
        setError(handleApiError(err, 'Failed to load database stats'));
      }
    } finally {
      setLoading(false);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'connecting':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'disconnected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return <LoadingSpinner message="Loading database stats..." />;
  }

  if (error) {
    return (
      <div>
        <ErrorDisplay error={error} />
        <button
          onClick={loadStats}
          className="mt-2 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-800 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-md">
        No database stats available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status and Database Statistics - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Connection Status</h3>
            <button
              onClick={loadStats}
              className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors text-sm"
            >
              Refresh
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(stats.connection.status)}`}>
                {stats.connection.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Database:</span>
              <span className="text-sm text-gray-900 dark:text-white font-mono">{stats.connection.database}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">State:</span>
              <span className="text-sm text-gray-900 dark:text-white">{stats.connection.state}</span>
            </div>
          </div>
        </div>

        {/* Database Statistics */}
        {stats.stats && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Database Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Data Size:</span>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{formatBytes(stats.stats.dataSize)}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Storage Size:</span>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{formatBytes(stats.stats.storageSize)}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Indexes:</span>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{stats.stats.indexes}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Index Size:</span>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{formatBytes(stats.stats.indexSize)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collections */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Collections</h3>
        {stats.collections.names.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No collections found</p>
        ) : (
          <div className="space-y-0">
            {stats.collections.names.map((name: string, index: number) => {
              const documentCount = stats.collections.counts[name] !== undefined && stats.collections.counts[name] >= 0
                ? stats.collections.counts[name]
                : 0;
              const isLast = index === stats.collections.names.length - 1;

              return (
                <div key={name}>
                  <div 
                    className={`flex items-center justify-between py-2 ${!isLast ? 'border-b border-gray-200 dark:border-gray-700' : ''} cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
                    onClick={() => setSelectedCollection(name)}
                  >
                    <div className="flex items-center space-x-2 flex-1">
                      <svg
                        className="w-4 h-4 text-gray-500 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-sm text-gray-900 dark:text-white font-mono">{name}</span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {documentCount >= 0 ? `${documentCount} documents` : 'Error getting count'}
                    </span>
                  </div>
                </div>
              );
            })}
            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-300">Total Collections: </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{stats.collections.total}</span>
            </div>
          </div>
        )}
      </div>

      {/* Collection Modal */}
      {selectedCollection && (
        <CollectionModal
          collectionName={selectedCollection}
          documentCount={stats.collections.counts[selectedCollection] || 0}
          onClose={() => setSelectedCollection(null)}
        />
      )}
    </div>
  );
}

