import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { checkAuth } from '@/lib/auth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { User } from '@/types/api';

export function Landing() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    checkAuth()
      .then((currentUser) => {
        setUser(currentUser);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-6">
            {user ? `Welcome back, ${user.name}!` : 'Watch AI Build Your App'}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            {user
              ? 'See your AI agents working in real-time. Beautiful, simple, magical.'
              : 'Experience the future of software development. Watch autonomous AI agents collaborate to build your application in real-time.'}
          </p>
          {!user && (
            <div className="mt-8 mb-8 max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="p-4">
                  <div className="text-3xl mb-2">👀</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Watch the Magic</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    See AI agents working in real-time with beautiful visualizations
                  </p>
                </div>
                <div className="p-4">
                  <div className="text-3xl mb-2">🤖</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Autonomous Pipeline</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    PM, Dev, and QA agents collaborate automatically to build your app
                  </p>
                </div>
                <div className="p-4">
                  <div className="text-3xl mb-2">✨</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Simple & Beautiful</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Focus on what matters - watch your ideas come to life
                  </p>
                </div>
              </div>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex justify-center space-x-4"
          >
            {user ? (
              <Link to="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors shadow-lg"
                >
                  Get Started
                </motion.button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors shadow-lg"
                  >
                    Get Started
                  </motion.button>
                </Link>
                <Link to="/login">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 font-bold py-3 px-8 rounded-lg text-lg border-2 border-blue-600 dark:border-blue-400 transition-colors shadow-lg"
                  >
                    Sign In
                  </motion.button>
                </Link>
              </>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
