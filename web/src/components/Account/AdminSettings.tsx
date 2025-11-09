import { motion } from 'framer-motion';

export function AdminSettings() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Admin Settings</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Administrative settings and system information.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            System Information
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Admin settings and system management features will be available here.
          </p>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Use the Dev Tools panel to access:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
              <li>User Access Management</li>
              <li>Role Management</li>
              <li>Permission Management</li>
              <li>Feature Flags</li>
              <li>Network Monitoring</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

