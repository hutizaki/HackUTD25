import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface PermissionManagerPanelProps {
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
const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 500;

export function PermissionManagerPanel({ isOpen, onClose, onMinimizedChange }: PermissionManagerPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, panelX: 0, panelY: 0 });
  
  const panelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Load saved state from localStorage
  const [panelState, setPanelState] = useState<PanelState>(() => {
    const saved = localStorage.getItem('permissionManagerPanelState');
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

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('permissionManagerPanelState', JSON.stringify(panelState));
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

  return (
    <motion.div
      ref={panelRef}
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
      className="bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col"
    >
      {/* Title Bar - Draggable */}
      <div
        ref={headerRef}
        onMouseDown={handleDragStart}
        className="bg-orange-500 text-white px-4 py-2 cursor-move flex items-center justify-between select-none"
      >
        <h2 className="text-lg font-semibold">Permission Manager</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPanelState((prev) => ({ ...prev, minimized: !prev.minimized }));
            }}
            className="text-white hover:text-orange-200 transition-colors p-1"
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
            className="text-white hover:text-orange-200 transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {!panelState.minimized && (
        <div className="p-6 flex-1 overflow-auto">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
            <p className="font-semibold mb-2">Permission Manager</p>
            <p className="text-sm">
              This tool will be implemented in a future update. It will allow you to manage user permissions and roles.
            </p>
          </div>
        </div>
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

