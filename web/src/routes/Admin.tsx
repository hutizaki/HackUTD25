import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { UserList } from '@/components/Admin/UserList';
import { UserDetailsModal } from '@/components/Admin/UserDetailsModal';
import { getCurrentUser } from '@/lib/auth';
import type { AdminUser } from '@/lib/admin';

function AdminContent() {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const user = await getCurrentUser();
      setCurrentUserId(user?.id || null);
    };
    loadCurrentUser();
  }, []);

  const handleUserUpdated = () => {
    setSelectedUser(null);
    setRefreshKey((prev) => prev + 1); // Force UserList to refresh
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-blue-600 text-white px-6 py-8 shadow-md">
            <h1 className="text-3xl font-bold mb-2 text-white">Admin Dashboard</h1>
            <p className="text-blue-50 opacity-90">User management</p>
          </div>

          {/* Content */}
          <div className="p-6">
            <motion.div
              key={refreshKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <UserList onUserClick={setSelectedUser} currentUserId={currentUserId} />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* User Details Modal */}
      <UserDetailsModal 
        user={selectedUser} 
        currentUserId={currentUserId}
        onClose={() => setSelectedUser(null)} 
        onUserUpdated={handleUserUpdated} 
      />
    </div>
  );
}

export function Admin() {
  return (
    <ProtectedRoute>
      <AdminContent />
    </ProtectedRoute>
  );
}

