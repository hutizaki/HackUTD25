import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  getFeatureFlags,
  updateFeatureFlag,
  createFeatureFlag,
  type FeatureFlag,
  type PaginationData,
} from '@/lib/admin';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { Pagination } from '@/components/common/Pagination';
import { handleApiError } from '@/lib/errorHandling';

export function FeatureFlagList() {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'enabled' | 'disabled' | null>(null);

  useEffect(() => {
    initializeFeatureFlags();
  }, []);

  useEffect(() => {
    loadFeatureFlags();
  }, [page, refreshKey]);

  // Ensure dark-mode-toggle feature flag exists
  const initializeFeatureFlags = async () => {
    try {
      // Try to load feature flags first
      const response = await getFeatureFlags(1, 100);
      const flags = response.data;
      
      // Check if dark-mode-toggle exists
      const darkModeToggleExists = flags.some(flag => flag.name === 'dark-mode-toggle');
      
      if (!darkModeToggleExists) {
        // Create the dark-mode-toggle feature flag if it doesn't exist
        try {
          await createFeatureFlag({
            name: 'dark-mode-toggle',
            description: 'Enable dark mode toggle functionality for users',
            enabled: false,
          });
          // Dispatch event to refresh feature flags across the app
          window.dispatchEvent(new Event('featureFlagsChanged'));
        } catch (createError) {
          // If it already exists (race condition), that's fine
          if (!(createError instanceof Error && createError.message.includes('already exists'))) {
            console.error('Failed to create dark-mode-toggle feature flag:', createError);
          }
        }
      }
    } catch (err) {
      // Silently fail - feature flags will load normally
      console.error('Failed to initialize feature flags:', err);
    }
  };

  const loadFeatureFlags = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getFeatureFlags(page, limit);
      setFeatureFlags(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(handleApiError(err, 'Failed to load feature flags'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (flag: FeatureFlag) => {
    try {
      await updateFeatureFlag(flag.name, { enabled: !flag.enabled });
      setRefreshKey((prev) => prev + 1);
      
      // Dispatch event to refresh feature flags across the app
      // This allows components using useFeatureFlags hook to update immediately
      window.dispatchEvent(new Event('featureFlagsChanged'));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle feature flag');
    }
  };

  if (loading && featureFlags.length === 0) {
    return <LoadingSpinner message="Loading feature flags..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  // Filter feature flags based on search and status
  const filteredFlags = featureFlags.filter((flag) => {
    // Search filter (name or description)
    const matchesSearch = searchTerm === '' || 
      flag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flag.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === null || 
      (statusFilter === 'enabled' && flag.enabled) ||
      (statusFilter === 'disabled' && !flag.enabled);
    
    return matchesSearch && matchesStatus;
  });

  const enabledCount = featureFlags.filter((f) => f.enabled).length;
  const disabledCount = featureFlags.length - enabledCount;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <button
          onClick={() => setStatusFilter(statusFilter === 'enabled' ? null : 'enabled')}
          className={`bg-green-50 dark:bg-green-900/20 border rounded-lg p-4 text-left transition-colors ${
            statusFilter === 'enabled'
              ? 'border-green-400 dark:border-green-600 ring-2 ring-green-300 dark:ring-green-700'
              : 'border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700'
          }`}
        >
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">Enabled</div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-300">{enabledCount}</div>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'disabled' ? null : 'disabled')}
          className={`bg-gray-50 dark:bg-gray-800 border rounded-lg p-4 text-left transition-colors ${
            statusFilter === 'disabled'
              ? 'border-gray-400 dark:border-gray-600 ring-2 ring-gray-300 dark:ring-gray-700'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Disabled</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{disabledCount}</div>
        </button>
      </div>

      {/* Search and Header */}
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Feature Flags</h3>
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or description..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>
        {statusFilter && (
          <button
            onClick={() => setStatusFilter(null)}
            className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Feature Flags Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Enabled
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredFlags.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  {featureFlags.length === 0
                    ? 'No feature flags found.'
                    : searchTerm || statusFilter
                    ? 'No feature flags match your search criteria.'
                    : 'No feature flags found.'}
                </td>
              </tr>
            ) : (
              filteredFlags.map((flag) => (
                <motion.tr
                  key={flag.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {flag.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {flag.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleToggleEnabled(flag)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        flag.enabled
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination pagination={pagination} currentPage={page} onPageChange={setPage} itemName="feature flags" />
    </div>
  );
}
