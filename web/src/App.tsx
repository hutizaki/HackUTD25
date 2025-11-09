import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext';
import { Navbar } from './components/Navbar';
import { DevTools } from './components/DevTools';
import { Landing } from './routes/Landing';
import { Register } from './routes/Register';
import { Login } from './routes/Login';
import { Dashboard } from './routes/Dashboard';
import { Account } from './routes/Account';
import { ProjectDetail } from './pages/ProjectDetail';
import { PipelinePage } from './routes/PipelinePage';
import { NotFound } from './routes/NotFound';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial load time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800); // 800ms loading time

    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="bg-gray-50 dark:bg-gray-900">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-gray-50 dark:bg-gray-900 flex items-center justify-center z-50"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <motion.div
                    className="w-16 h-16 border-4 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full mx-auto mb-4"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-gray-600 dark:text-gray-300 text-lg font-medium"
                  >
                    Loading...
                  </motion.p>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="app"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Navbar />
                <div className="pt-16">
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/projects/:id" element={<ProjectDetail />} />
                    <Route path="/projects/:projectId/pipeline/:runId" element={<PipelinePage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
                {import.meta.env.DEV && <DevTools />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
