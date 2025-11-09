import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CookiesTab } from './StorageManager/CookiesTab';
import { LocalStorageTab } from './StorageManager/LocalStorageTab';
import { SessionStorageTab } from './StorageManager/SessionStorageTab';
import { CacheStorageTab } from './StorageManager/CacheStorageTab';
import { DatabaseInfo } from './Admin/DatabaseInfo';
import { getAllCookies } from '@/lib/cookies';
import { getAllLocalStorageItems, getAllSessionStorageItems } from '@/lib/storage';

type StorageTab = 'cookies' | 'localStorage' | 'sessionStorage' | 'cacheStorage' | 'database';

interface TabButtonProps {
  tab: { id: StorageTab; label: string; count?: number; description: string };
  activeTab: StorageTab;
  onTabClick: (tabId: StorageTab) => void;
}

function TabButton({ tab, activeTab, onTabClick }: TabButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<'left' | 'right'>('left');
  const iconRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleIconMouseEnter = () => {
    setShowTooltip(true);
    // Check if tooltip would overflow to the right
    setTimeout(() => {
      if (iconRef.current && tooltipRef.current) {
        const iconRect = iconRef.current.getBoundingClientRect();
        const tooltipWidth = 288; // w-72 = 18rem = 288px
        const viewportWidth = window.innerWidth;
        const padding = 16; // Add some padding from the edge
        
        // If tooltip would overflow to the right, position it to the right of the icon
        if (iconRect.left + tooltipWidth + padding > viewportWidth) {
          setTooltipPosition('right');
        } else {
          setTooltipPosition('left');
        }
      }
    }, 0);
  };

  return (
    <div className="relative">
      <button
        onClick={() => onTabClick(tab.id)}
        className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
          activeTab === tab.id
            ? 'border-amber-600 dark:border-amber-400 text-amber-600 dark:text-amber-400'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <span>{tab.label}</span>
        {tab.count !== undefined && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            activeTab === tab.id
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}>
            {tab.count}
          </span>
        )}
        <svg
          ref={iconRef}
          className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          onMouseEnter={handleIconMouseEnter}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      {/* Tooltip */}
      {showTooltip && (
        <div
          ref={tooltipRef}
          className={`absolute top-full mt-2 w-72 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl z-50 transition-all duration-200 ${
            tooltipPosition === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{ opacity: showTooltip ? 1 : 0 }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <p className="leading-relaxed">{tab.description}</p>
          {/* Arrow */}
          <div
            className={`absolute bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900 dark:border-b-gray-700 ${
              tooltipPosition === 'right' ? 'right-4' : 'left-4'
            }`}
          ></div>
        </div>
      )}
    </div>
  );
}

interface StorageManagerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimizedChange?: (minimized: boolean, position: { x: number; y: number }) => void;
}

interface PanelState {
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
}

const MIN_WIDTH = 500;
const MIN_HEIGHT = 400;
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

export function StorageManagerPanel({ isOpen, onClose, onMinimizedChange }: StorageManagerPanelProps) {
  const [activeTab, setActiveTab] = useState<StorageTab>('cookies');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, panelX: 0, panelY: 0 });
  
  const panelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Get counts for each storage type
  const getCookieCount = () => getAllCookies().length;
  const getLocalStorageCount = () => getAllLocalStorageItems().length;
  const getSessionStorageCount = () => getAllSessionStorageItems().length;
  const getCacheStorageCount = async () => {
    try {
      const cacheNames = await caches.keys();
      let total = 0;
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        total += keys.length;
      }
      return total;
    } catch {
      return 0;
    }
  };

  const [counts, setCounts] = useState({
    cookies: getCookieCount(),
    localStorage: getLocalStorageCount(),
    sessionStorage: getSessionStorageCount(),
    cacheStorage: 0,
  });

  // Update counts periodically
  useEffect(() => {
    const updateCounts = async () => {
      setCounts({
        cookies: getCookieCount(),
        localStorage: getLocalStorageCount(),
        sessionStorage: getSessionStorageCount(),
        cacheStorage: await getCacheStorageCount(),
      });
    };
    updateCounts();
    const interval = setInterval(updateCounts, 2000);
    return () => clearInterval(interval);
  }, []);

  // Load saved state from localStorage
  const [panelState, setPanelState] = useState<PanelState>(() => {
    const saved = localStorage.getItem('storageManagerPanelState');
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
      setSearchTerm(''); // Reset search when opening
    }
  }, [isOpen]);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('storageManagerPanelState', JSON.stringify(panelState));
  }, [panelState]);

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

  // Hide panel when minimized, show bubble instead
  if (!isOpen || panelState.minimized) return null;

  const tabs: { id: StorageTab; label: string; count?: number; description: string }[] = [
    { 
      id: 'cookies', 
      label: 'Cookies', 
      count: counts.cookies,
      description: 'Cookies are small pieces of data stored by websites in your browser. They can be JavaScript-accessible or HttpOnly (server-only). Cookies are sent with every request to the server and can persist across sessions.'
    },
    { 
      id: 'localStorage', 
      label: 'Local', 
      count: counts.localStorage,
      description: 'Local Storage is a web storage API that allows websites to store data in the browser with no expiration date. Data persists even after the browser is closed and is specific to the origin (domain).'
    },
    { 
      id: 'sessionStorage', 
      label: 'Session', 
      count: counts.sessionStorage,
      description: 'Session Storage is similar to Local Storage, but data is only available for the duration of the browser tab session. When the tab is closed, the data is cleared. Data is specific to the origin (domain).'
    },
    { 
      id: 'cacheStorage', 
      label: 'Cache', 
      count: counts.cacheStorage,
      description: 'Cache Storage (Cache API) is used by service workers to cache network requests. It allows websites to store HTTP responses for offline use and faster loading. Caches persist until explicitly deleted.'
    },
    { 
      id: 'database', 
      label: 'Database',
      description: 'Database tab shows connection status, statistics, and collections from the MongoDB database. You can view and edit documents within each collection.'
    },
  ];

  return (
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
        className="bg-amber-500 text-white px-4 py-2 cursor-move flex items-center justify-between select-none"
      >
        <h2 className="text-lg font-semibold">Storage Manager</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPanelState((prev) => ({ ...prev, minimized: !prev.minimized }));
            }}
            className="text-white hover:text-amber-200 transition-colors p-1"
            aria-label={panelState.minimized ? 'Maximize' : 'Minimize'}
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
            className="text-white hover:text-amber-200 transition-colors p-1"
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
              {tabs.map((tab) => (
                <TabButton
                  key={tab.id}
                  tab={tab}
                  activeTab={activeTab}
                  onTabClick={(tabId) => {
                    setActiveTab(tabId);
                    setSearchTerm(''); // Reset search when switching tabs
                  }}
                />
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="p-4 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900">
            {activeTab === 'cookies' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <CookiesTab searchTerm={searchTerm} onSearchChange={setSearchTerm} />
              </motion.div>
            )}

            {activeTab === 'localStorage' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <LocalStorageTab searchTerm={searchTerm} onSearchChange={setSearchTerm} />
              </motion.div>
            )}

            {activeTab === 'sessionStorage' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <SessionStorageTab searchTerm={searchTerm} onSearchChange={setSearchTerm} />
              </motion.div>
            )}

            {activeTab === 'cacheStorage' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <CacheStorageTab searchTerm={searchTerm} onSearchChange={setSearchTerm} />
              </motion.div>
            )}

            {activeTab === 'database' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <DatabaseInfo />
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
  );
}

// Export as CookieManagerPanel for backward compatibility
export const CookieManagerPanel = StorageManagerPanel;
