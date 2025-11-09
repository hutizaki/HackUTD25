import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { UserList } from './UserList';
import { UserDetailsModal } from './UserDetailsModal';
import { RoleManager } from './RoleManager';
import { PermissionManager } from './PermissionManager';
import { getCurrentUser } from '@/lib/auth';
import type { AdminUser } from '@/lib/admin';
import type { User } from '@/types/api';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimizedChange?: (minimized: boolean, position: { x: number; y: number }) => void;
}

interface AdminPanelState {
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
}

const MIN_WIDTH = 600;
const MIN_HEIGHT = 400;
const DEFAULT_WIDTH = 900;
const DEFAULT_HEIGHT = 700;

type Tab = 'users' | 'permissions' | 'roles';

export function AdminPanel({ isOpen, onClose, onMinimizedChange }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, panelX: 0, panelY: 0 });
  
  const panelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Load current user
  useEffect(() => {
    if (isOpen) {
      getCurrentUser()
        .then((user) => {
          setCurrentUser(user);
        })
        .catch(() => {
          setCurrentUser(null);
        });
    }
  }, [isOpen]);

  // Load saved state from localStorage
  const [panelState, setPanelState] = useState<AdminPanelState>(() => {
    const saved = localStorage.getItem('adminPanelState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          x: parsed.x ?? window.innerWidth / 2 - DEFAULT_WIDTH / 2,
          y: parsed.y ?? window.innerHeight / 2 - DEFAULT_HEIGHT / 2,
          width: parsed.width ?? DEFAULT_WIDTH,
          height: parsed.height ?? DEFAULT_HEIGHT,
          minimized: parsed.minimized ?? false,
        };
      } catch {
        // Invalid saved state
      }
    }
    return {
      x: window.innerWidth / 2 - DEFAULT_WIDTH / 2,
      y: window.innerHeight / 2 - DEFAULT_HEIGHT / 2,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      minimized: false,
    };
  });

  // Reset to center and default size when panel becomes visible
  useEffect(() => {
    if (isOpen) {
      setPanelState({
        x: window.innerWidth / 2 - DEFAULT_WIDTH / 2,
        y: window.innerHeight / 2 - DEFAULT_HEIGHT / 2,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        minimized: false,
      });
    }
  }, [isOpen]);

  // Notify parent of minimized state changes
  useEffect(() => {
    if (onMinimizedChange) {
      onMinimizedChange(panelState.minimized, { x: panelState.x, y: panelState.y });
    }
  }, [panelState.minimized, panelState.x, panelState.y, onMinimizedChange]);

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent) => {
    if (!headerRef.current || isResizing) return;
    setIsDragging(true);
    const rect = headerRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    if (!panelRef.current) return;
    setIsResizing(direction);
    const rect = panelRef.current.getBoundingClientRect();
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
      panelX: panelState.x,
      panelY: panelState.y,
    });
  };

  // Handle drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Keep within viewport bounds
      const maxX = window.innerWidth - panelState.width;
      const maxY = window.innerHeight - (panelState.minimized ? 50 : panelState.height);

      setPanelState((prev) => ({
        ...prev,
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      }));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, panelState.width, panelState.height, panelState.minimized]);

  // Handle resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;

      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      setPanelState((prev) => {
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newX = resizeStart.panelX;
        let newY = resizeStart.panelY;

        // Handle different resize directions
        if (isResizing.includes('right')) {
          newWidth = Math.max(MIN_WIDTH, Math.min(resizeStart.width + deltaX, window.innerWidth - resizeStart.panelX));
        }
        if (isResizing.includes('left')) {
          const widthChange = resizeStart.width - deltaX;
          if (widthChange >= MIN_WIDTH && resizeStart.panelX + deltaX >= 0) {
            newWidth = widthChange;
            newX = resizeStart.panelX + deltaX;
          }
        }
        if (isResizing.includes('bottom')) {
          newHeight = Math.max(MIN_HEIGHT, Math.min(resizeStart.height + deltaY, window.innerHeight - resizeStart.panelY));
        }
        if (isResizing.includes('top')) {
          const heightChange = resizeStart.height - deltaY;
          if (heightChange >= MIN_HEIGHT && resizeStart.panelY + deltaY >= 0) {
            newHeight = heightChange;
            newY = resizeStart.panelY + deltaY;
          }
        }

        // Keep within viewport bounds
        if (newX + newWidth > window.innerWidth) {
          newWidth = window.innerWidth - newX;
        }
        if (newY + newHeight > window.innerHeight) {
          newHeight = window.innerHeight - newY;
        }

        return {
          ...prev,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        };
      });
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart]);

  const handleUserUpdated = () => {
    setSelectedUser(null);
    setRefreshKey((prev) => prev + 1);
  };

  // Hide panel when minimized, show bubble instead
  if (!isOpen || panelState.minimized) return null;

  return (
    <>
      <motion.div
        ref={panelRef}
        data-dev-tools-panel
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={{
          position: 'fixed',
          left: `${panelState.x}px`,
          top: `${panelState.y}px`,
          width: `${panelState.width}px`,
          height: panelState.minimized ? '50px' : `${panelState.height}px`,
          zIndex: 10000,
        }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Title Bar - Draggable */}
        <div
          ref={headerRef}
          onMouseDown={handleDragStart}
          className="bg-blue-600 text-white px-4 py-2 cursor-move flex items-center justify-between select-none"
        >
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold">User Access</h2>
            {panelState.minimized && (
              <span className="text-xs text-blue-200">(Minimized)</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPanelState((prev) => ({ ...prev, minimized: !prev.minimized }))}
              className="text-white hover:text-blue-200 transition-colors p-1"
              aria-label={panelState.minimized ? 'Restore' : 'Minimize'}
            >
              {panelState.minimized ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors p-1"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {!panelState.minimized && (
          <>
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'users'
                      ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'permissions'
                      ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  Permissions
                </button>
                <button
                  onClick={() => setActiveTab('roles')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'roles'
                      ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  Roles
                </button>
              </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
              {activeTab === 'users' && (
                <motion.div
                  key={refreshKey}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <UserList onUserClick={setSelectedUser} currentUserId={currentUser?.id} />
                </motion.div>
              )}
              {activeTab === 'permissions' && (
                <motion.div
                  key="permissions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <PermissionManager />
                </motion.div>
              )}
              {activeTab === 'roles' && (
                <motion.div
                  key="roles"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <RoleManager />
                </motion.div>
              )}
            </div>
          </>
        )}

        {/* Resize Handles */}
        {!panelState.minimized && (
          <>
            {/* Corner handles */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'top-left')}
              className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-10"
              style={{ cursor: 'nwse-resize' }}
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, 'top-right')}
              className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-10"
              style={{ cursor: 'nesw-resize' }}
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
              className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-10"
              style={{ cursor: 'nesw-resize' }}
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
              className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-10"
              style={{ cursor: 'nwse-resize' }}
            />
            {/* Edge handles */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'top')}
              className="absolute top-0 left-3 right-3 h-2 cursor-ns-resize z-10"
              style={{ cursor: 'ns-resize' }}
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, 'bottom')}
              className="absolute bottom-0 left-3 right-3 h-2 cursor-ns-resize z-10"
              style={{ cursor: 'ns-resize' }}
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, 'left')}
              className="absolute left-0 top-3 bottom-3 w-2 cursor-ew-resize z-10"
              style={{ cursor: 'ew-resize' }}
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, 'right')}
              className="absolute right-0 top-3 bottom-3 w-2 cursor-ew-resize z-10"
              style={{ cursor: 'ew-resize' }}
            />
          </>
        )}
      </motion.div>

      {/* User Details Modal */}
      <UserDetailsModal
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onUserUpdated={handleUserUpdated}
      />
    </>
  );
}

