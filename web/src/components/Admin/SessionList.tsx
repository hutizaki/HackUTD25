import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getSessions, revokeSession, type Session, type PaginationData } from '@/lib/admin';
import { RevokeSessionConfirm } from './RevokeSessionConfirm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { Pagination } from '@/components/common/Pagination';
import { handleApiError } from '@/lib/errorHandling';

export function SessionList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [userIdFilter, setUserIdFilter] = useState<string>('');
  const [userIdInput, setUserIdInput] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadSessions();
  }, [page, statusFilter, userIdFilter, refreshKey]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSessions(
        userIdFilter || undefined,
        statusFilter,
        page,
        limit
      );
      setSessions(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(handleApiError(err, 'Failed to load sessions'));
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    try {
      await revokeSession(sessionId);
      setRefreshKey((prev) => prev + 1);
      setSelectedSession(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revoke session');
    }
  };

  const handleUserIdSearch = () => {
    setUserIdFilter(userIdInput);
    setPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleUserIdSearch();
    }
  };

  // Calculate session counts by status
  const activeCount = sessions.filter((s) => s.status === 'active').length;
  const expiredCount = sessions.filter((s) => s.status === 'expired').length;
  const revokedCount = sessions.filter((s) => s.status === 'revoked').length;

  if (loading && sessions.length === 0) {
    return <LoadingSpinner message="Loading sessions..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium">Active</div>
          <div className="text-2xl font-bold text-green-900">{activeCount}</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-600 font-medium">Expired</div>
          <div className="text-2xl font-bold text-yellow-900">{expiredCount}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-600 font-medium">Revoked</div>
          <div className="text-2xl font-bold text-red-900">{revokedCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
            <option value="all">All</option>
          </select>
        </div>
        <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
          <input
            type="text"
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Filter by User ID..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleUserIdSearch}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
          >
            Search
          </button>
          {userIdFilter && (
            <button
              onClick={() => {
                setUserIdFilter('');
                setUserIdInput('');
                setPage(1);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User Agent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expires At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  No sessions found
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <motion.tr
                  key={session.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div>
                      <div className="text-gray-900 font-medium">
                        {session.userEmail || session.userName || 'Unknown'}
                      </div>
                      {session.userName && session.userEmail && (
                        <div className="text-gray-500 text-xs">{session.userEmail}</div>
                      )}
                      <div className="text-gray-400 text-xs mt-1">ID: {session.userId}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {session.ipAddress || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={session.userAgent || ''}>
                    {session.userAgent || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(session.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(session.expiresAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(session.lastActivity).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        session.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : session.status === 'expired'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {session.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {session.status !== 'revoked' && (
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination pagination={pagination} currentPage={page} onPageChange={setPage} itemName="sessions" />

      {/* Revoke Session Confirmation Modal */}
      {selectedSession && (
        <RevokeSessionConfirm
          session={selectedSession}
          onConfirm={() => handleRevoke(selectedSession.id)}
          onCancel={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}