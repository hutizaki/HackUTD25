import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminPanel } from './Admin/AdminPanel';
import { StorageManagerPanel } from './CookieManagerPanel';
import { FeatureFlagsPanel } from './FeatureFlagsPanel';
import { NetworkPanel } from './NetworkPanel';

/**
 * DevTools component - Only renders in development
 */
export function DevTools() {
  // Only render in development
  if (!import.meta.env.DEV) {
    return null;
  }

  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const [showStorageManager, setShowStorageManager] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showFeatureFlags, setShowFeatureFlags] = useState(false);
  const [showNetworkPanel, setShowNetworkPanel] = useState(false);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [minimizedPanels, setMinimizedPanels] = useState<{
    admin?: { minimized: boolean; position: { x: number; y: number } };
    storage?: { minimized: boolean; position: { x: number; y: number } };
    featureFlags?: { minimized: boolean; position: { x: number; y: number } };
    network?: { minimized: boolean; position: { x: number; y: number } };
  }>({});
  
  // Track which tools are dragged out from the toolbar
  const [draggedOutTools, setDraggedOutTools] = useState<{
    admin?: { x: number; y: number };
    storage?: { x: number; y: number };
    featureFlags?: { x: number; y: number };
    network?: { x: number; y: number };
  }>({});
  
  // Track dragging state for each tool
  const [draggingTool, setDraggingTool] = useState<string | null>(null);
  const [toolDragStart, setToolDragStart] = useState({ x: 0, y: 0 });
  const [toolHasDragged, setToolHasDragged] = useState(false);
  const [toolMouseDownPos, setToolMouseDownPos] = useState({ x: 0, y: 0 });
  const toolHasDraggedRef = useRef<Record<string, boolean>>({});
  
  // Track last mouse position for minimize
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  // Track if toolbar was open before dragging (to prevent toggling if already open)
  const [toolbarWasOpenBeforeDrag, setToolbarWasOpenBeforeDrag] = useState(false);
  
  // Track original toolbar state before approaching (for restoring if user drags away)
  const [originalToolbarState, setOriginalToolbarState] = useState(false);
  
  // Sticky distance threshold (in pixels)
  const STICKY_DISTANCE = 80;
  // Minimum distance to start dragging (in pixels)
  const DRAG_THRESHOLD = 5;
  
  // Track mouse position globally
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setLastMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  const devToolsRef = useRef<HTMLDivElement>(null);

  // Load saved position from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('devToolsIconPosition');
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        setPosition(pos);
      } catch {
        // Invalid saved position, use default (bottom-right)
        setPosition({
          x: window.innerWidth - 60,
          y: window.innerHeight - 60,
        });
      }
    } else {
      // Default position: bottom-right
      setPosition({
        x: window.innerWidth - 60,
        y: window.innerHeight - 60,
      });
    }
  }, []);

  // Save position to localStorage when it changes
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem('devToolsIconPosition', JSON.stringify(position));
    }
  }, [position]);

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!devToolsRef.current) return;
    setIsDragging(true);
    setHasDragged(false);
    const rect = devToolsRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Handle drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setHasDragged(true);
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Keep within viewport bounds
      const iconSize = 48; // Approximate size of the icon
      const maxX = window.innerWidth - iconSize;
      const maxY = window.innerHeight - iconSize;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
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
  }, [isDragging, dragStart]);

  // Calculate quarter-circle positions for tools
  const getQuarterCirclePositions = () => {
    const iconSize = 48;
    const radius = 70; // Distance from center of icon
    const iconCenterX = position.x + iconSize / 2;
    const iconCenterY = position.y + iconSize / 2;
    
    // Determine which quadrant to use based on icon position
    const distanceToBottom = window.innerHeight - (position.y + iconSize);
    const distanceToTop = position.y;
    const distanceToRight = window.innerWidth - (position.x + iconSize);
    const distanceToLeft = position.x;
    
    // Use the quadrant with most space
    let startAngle = 0;
    if (distanceToBottom < distanceToTop && distanceToRight < distanceToLeft) {
      // Top-left quadrant
      startAngle = 180;
    } else if (distanceToBottom < distanceToTop && distanceToRight >= distanceToLeft) {
      // Top-right quadrant
      startAngle = 270;
    } else if (distanceToBottom >= distanceToTop && distanceToRight < distanceToLeft) {
      // Bottom-left quadrant
      startAngle = 90;
    } else {
      // Bottom-right quadrant (default)
      startAngle = 0;
    }
    
    // 4 tools in a quarter circle (90 degrees total, so 30 degrees between each)
    const angles = [startAngle, startAngle + 30, startAngle + 60, startAngle + 90];
    
    return angles.map((angle) => {
      const rad = (angle * Math.PI) / 180;
      return {
        x: iconCenterX + radius * Math.cos(rad) - 24, // -24 to center the button
        y: iconCenterY + radius * Math.sin(rad) - 24, // -24 to center the button
      };
    });
  };
  
  // Handle tool mouse down (only for free-roaming bubbles, not toolbar bubbles)
  const handleToolMouseDown = (e: React.MouseEvent, toolId: string) => {
    e.stopPropagation();
    // Only allow dragging if the tool is already free-roaming (dragged out)
    const currentPos = draggedOutTools[toolId as keyof typeof draggedOutTools];
    if (!currentPos) {
      // Tool is still in toolbar - don't allow dragging
      return;
    }
    
    // Reset drag state for this tool
    setToolHasDragged(false);
    toolHasDraggedRef.current[toolId] = false;
    setToolMouseDownPos({ x: e.clientX, y: e.clientY });
    // Remember if toolbar was open before dragging
    setToolbarWasOpenBeforeDrag(isExpanded);
    // Remember original toolbar state before approaching
    setOriginalToolbarState(isExpanded);
    
    setToolDragStart({
      x: e.clientX - (currentPos?.x || 0),
      y: e.clientY - (currentPos?.y || 0),
    });
  };
  
  // Calculate distance between two points
  const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };
  
  // Get original quarter-circle position for a tool
  const getOriginalToolPosition = (toolId: string) => {
    const positions = getQuarterCirclePositions();
    const tools = getToolsConfig();
    const toolIndex = tools.findIndex(t => t.toolId === toolId);
    if (toolIndex >= 0) {
      return positions[toolIndex];
    }
    return null;
  };
  
  // Handle tool drag (only for free-roaming bubbles, not toolbar bubbles)
  useEffect(() => {
    if (!draggingTool) return;
    
    // Only allow dragging if the tool is already free-roaming (dragged out)
    const currentPos = draggedOutTools[draggingTool as keyof typeof draggedOutTools];
    if (!currentPos) {
      // Tool is still in toolbar - don't allow dragging
      setDraggingTool(null);
      return;
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      // Check if mouse has moved enough to start dragging
      // Check if we've moved beyond the drag threshold from mouse down position
      const deltaX = Math.abs(e.clientX - toolMouseDownPos.x);
      const deltaY = Math.abs(e.clientY - toolMouseDownPos.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Only proceed with dragging if we've moved beyond the threshold
      if (distance <= DRAG_THRESHOLD) {
        // Not enough movement - don't drag, allow click
        toolHasDraggedRef.current[draggingTool] = false;
        setToolHasDragged(false);
        return;
      }
      
      // We've moved beyond threshold - this is a drag
      if (!toolHasDragged) {
        setToolHasDragged(true);
      }
      toolHasDraggedRef.current[draggingTool] = true;
      
      const newX = e.clientX - toolDragStart.x;
      const newY = e.clientY - toolDragStart.y;
      
      // Keep within viewport bounds
      const buttonSize = 48;
      const maxX = window.innerWidth - buttonSize;
      const maxY = window.innerHeight - buttonSize;
      
      let clampedX = Math.max(0, Math.min(newX, maxX));
      let clampedY = Math.max(0, Math.min(newY, maxY));
      
      // Magnetic pull effect - check distance from original position
      const originalPos = getOriginalToolPosition(draggingTool);
      if (originalPos) {
        const bubbleCenterX = clampedX + 24;
        const bubbleCenterY = clampedY + 24;
        const originalCenterX = originalPos.x + 24;
        const originalCenterY = originalPos.y + 24;
        const distance = getDistance(bubbleCenterX, bubbleCenterY, originalCenterX, originalCenterY);
        
        if (distance < STICKY_DISTANCE && distance > 0) {
          // Apply magnetic pull - the closer you get, the stronger the pull
          const pullStrength = 1 - (distance / STICKY_DISTANCE); // 0 to 1, stronger when closer
          const pullAmount = pullStrength * 0.5; // Max 50% pull toward target
          
          const deltaX = originalCenterX - bubbleCenterX;
          const deltaY = originalCenterY - bubbleCenterY;
          
          clampedX += deltaX * pullAmount;
          clampedY += deltaY * pullAmount;
          
          // Re-clamp after pull
          clampedX = Math.max(0, Math.min(clampedX, maxX));
          clampedY = Math.max(0, Math.min(clampedY, maxY));
        }
      }
      
      // Magnetic pull effect - check distance from settings icon
      const iconCenterX = position.x + 24;
      const iconCenterY = position.y + 24;
      const bubbleCenterX = clampedX + 24;
      const bubbleCenterY = clampedY + 24;
      const distanceFromIcon = getDistance(bubbleCenterX, bubbleCenterY, iconCenterX, iconCenterY);
      
      if (distanceFromIcon < STICKY_DISTANCE && distanceFromIcon > 0) {
        // Apply magnetic pull toward settings icon
        const pullStrength = 1 - (distanceFromIcon / STICKY_DISTANCE); // 0 to 1, stronger when closer
        const pullAmount = pullStrength * 0.5; // Max 50% pull toward target
        
        const deltaX = iconCenterX - bubbleCenterX;
        const deltaY = iconCenterY - bubbleCenterY;
        
        clampedX += deltaX * pullAmount;
        clampedY += deltaY * pullAmount;
        
        // Re-clamp after pull
        clampedX = Math.max(0, Math.min(clampedX, maxX));
        clampedY = Math.max(0, Math.min(clampedY, maxY));
        
        // Open toolbar if it was closed before dragging (temporarily to allow return)
        if (!originalToolbarState && !isExpanded) {
          setIsExpanded(true);
        }
      } else {
        // Dragging away from settings icon - restore original toolbar state
        if (!originalToolbarState && isExpanded) {
          setIsExpanded(false);
        }
      }
      
      // Update position immediately
      setDraggedOutTools((prev) => ({
        ...prev,
        [draggingTool]: {
          x: clampedX,
          y: clampedY,
        },
      }));
    };
    
    const handleMouseUp = () => {
      const dragged = toolHasDraggedRef.current[draggingTool] || false;
      
      // Only check for snap-back if we actually dragged
      if (dragged) {
        // Check if we should snap back on mouse up
        const currentPos = draggedOutTools[draggingTool as keyof typeof draggedOutTools];
        if (currentPos) {
          const bubbleCenterX = currentPos.x + 24;
          const bubbleCenterY = currentPos.y + 24;
          
          // Check distance from original position
          const originalPos = getOriginalToolPosition(draggingTool);
          if (originalPos) {
            const originalCenterX = originalPos.x + 24;
            const originalCenterY = originalPos.y + 24;
            const distance = getDistance(bubbleCenterX, bubbleCenterY, originalCenterX, originalCenterY);
            
            if (distance < STICKY_DISTANCE) {
              // Close to original position - snap back
              setDraggedOutTools((prev) => {
                const updated = { ...prev };
                delete updated[draggingTool as keyof typeof updated];
                return updated;
              });
              setDraggingTool(null);
              setToolHasDragged(false);
              // Keep ref true to prevent click
              setTimeout(() => {
                toolHasDraggedRef.current[draggingTool] = false;
              }, 100);
              return;
            }
          }
          
          // Check distance from settings icon
          const iconCenterX = position.x + 24;
          const iconCenterY = position.y + 24;
          const distanceFromIcon = getDistance(bubbleCenterX, bubbleCenterY, iconCenterX, iconCenterY);
          
          if (distanceFromIcon < STICKY_DISTANCE) {
            // Close to settings icon - return to toolbar
            // Restore original toolbar state
            if (!originalToolbarState) {
              setIsExpanded(false);
            } else {
              setIsExpanded(true);
            }
            setDraggedOutTools((prev) => {
              const updated = { ...prev };
              delete updated[draggingTool as keyof typeof updated];
              return updated;
            });
            setDraggingTool(null);
            setToolHasDragged(false);
            // Keep ref true to prevent click
            setTimeout(() => {
              toolHasDraggedRef.current[draggingTool] = false;
            }, 100);
            return;
          } else {
            // Dragging away from settings icon - restore original toolbar state
            if (!originalToolbarState && isExpanded) {
              setIsExpanded(false);
            } else if (originalToolbarState && !isExpanded) {
              setIsExpanded(true);
            }
          }
        }
      }
      
      const currentTool = draggingTool;
      const actuallyDragged = currentTool && toolHasDraggedRef.current[currentTool] === true;
      
      // Don't reset draggingTool immediately - let onClick handler check it first
      // Reset after a short delay to allow click handler to check the ref
      if (currentTool) {
        // Always delay reset to allow onClick to fire first
        setTimeout(() => {
          setDraggingTool(null);
          setToolHasDragged(false);
          // Only reset ref if we actually dragged (to prevent double-clicks)
          if (actuallyDragged) {
            toolHasDraggedRef.current[currentTool] = false;
          }
        }, 50);
      }
      
      // Restore original toolbar state if we were dragging
      if (currentTool && actuallyDragged && isExpanded !== originalToolbarState) {
        setIsExpanded(originalToolbarState);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingTool, toolDragStart, position, isExpanded, draggedOutTools, toolHasDragged, toolMouseDownPos, toolbarWasOpenBeforeDrag, originalToolbarState]);
  
  // Define tools array (used in multiple places)
  const getToolsConfig = () => [
    { id: 'admin', label: 'User Access', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ), color: 'bg-blue-500 hover:bg-blue-600', onClick: () => {
      if (minimizedPanels.admin) {
        const saved = localStorage.getItem('adminPanelState');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            localStorage.setItem('adminPanelState', JSON.stringify({ ...parsed, minimized: false }));
          } catch {}
        }
        setMinimizedPanels((prev) => ({ ...prev, admin: undefined }));
        setShowAdminPanel(false);
        setTimeout(() => setShowAdminPanel(true), 0);
      } else {
        setShowAdminPanel((prev) => !prev);
      }
      // Keep toolbar open when modal opens
      setIsExpanded(true);
    }, isOpen: showAdminPanel && !minimizedPanels.admin, disabled: false, toolId: 'admin' },
    { id: 'storage', label: 'Storage Manager', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ), color: 'bg-amber-500 hover:bg-amber-600', onClick: () => {
      if (minimizedPanels.storage) {
        const saved = localStorage.getItem('storageManagerPanelState');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            localStorage.setItem('storageManagerPanelState', JSON.stringify({ ...parsed, minimized: false }));
          } catch {}
        }
        setMinimizedPanels((prev) => ({ ...prev, storage: undefined }));
        setShowStorageManager(false);
        setTimeout(() => setShowStorageManager(true), 0);
      } else {
        setShowStorageManager((prev) => !prev);
      }
      // Keep toolbar open when modal opens
      setIsExpanded(true);
    }, isOpen: showStorageManager && !minimizedPanels.storage, disabled: false, toolId: 'storage' },
    { id: 'featureFlags', label: 'Feature Flags', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ), color: 'bg-purple-500 hover:bg-purple-600', onClick: () => {
      if (minimizedPanels.featureFlags) {
        const saved = localStorage.getItem('featureFlagsPanelState');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            localStorage.setItem('featureFlagsPanelState', JSON.stringify({ ...parsed, minimized: false }));
          } catch {}
        }
        setMinimizedPanels((prev) => ({ ...prev, featureFlags: undefined }));
        setShowFeatureFlags(false);
        setTimeout(() => setShowFeatureFlags(true), 0);
      } else {
        setShowFeatureFlags((prev) => !prev);
      }
      // Keep toolbar open when modal opens
      setIsExpanded(true);
    }, isOpen: showFeatureFlags && !minimizedPanels.featureFlags, disabled: false, toolId: 'featureFlags' },
    { id: 'network', label: 'Network Panel', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ), color: 'bg-teal-500 hover:bg-teal-600', onClick: () => {
      if (minimizedPanels.network) {
        const saved = localStorage.getItem('networkPanelState');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            localStorage.setItem('networkPanelState', JSON.stringify({ ...parsed, minimized: false }));
          } catch {}
        }
        setMinimizedPanels((prev) => ({ ...prev, network: undefined }));
        setShowNetworkPanel(false);
        setTimeout(() => setShowNetworkPanel(true), 0);
      } else {
        setShowNetworkPanel((prev) => !prev);
      }
      // Keep toolbar open when modal opens
      setIsExpanded(true);
    }, isOpen: showNetworkPanel && !minimizedPanels.network, disabled: false, toolId: 'network' },
  ];

  const handleIconClick = () => {
    // Prevent click if user was dragging
    if (hasDragged) {
      setHasDragged(false);
      return;
    }
    setIsExpanded((prev) => !prev);
  };
  
  // Handle double-click on settings icon
  const handleIconDoubleClick = () => {
    // Return all free roaming bubbles to toolbar
    setDraggedOutTools({});
    setIsExpanded(true);
  };

  // Close menu when clicking outside (but not when a modal is open)
  useEffect(() => {
    if (!isExpanded) return;
    
    // Don't close if any modal is open
    const hasOpenModal = showAdminPanel || showStorageManager || showFeatureFlags || showNetworkPanel;
    if (hasOpenModal) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Check if click is on the settings icon
      if (devToolsRef.current && devToolsRef.current.contains(target)) {
        return;
      }
      // Check if click is on any tool button
      const toolButtons = document.querySelectorAll('[data-tool-button]');
      for (const button of toolButtons) {
        if (button.contains(target)) {
          return;
        }
      }
      // Check if click is on any modal panel
      const panels = document.querySelectorAll('[data-dev-tools-panel]');
      for (const panel of panels) {
        if (panel.contains(target)) {
          return;
        }
      }
      // Click is outside, close menu
      setIsExpanded(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded, showAdminPanel, showStorageManager, showFeatureFlags, showNetworkPanel]);

  return (
    <>
      {/* Draggable Settings Icon */}
      <motion.div
        ref={devToolsRef}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9999,
        }}
        className="font-sans relative"
      >
        {/* Gear Icon - Always Visible */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onMouseDown={handleMouseDown}
          onClick={handleIconClick}
          onDoubleClick={handleIconDoubleClick}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full p-3 shadow-lg transition-colors cursor-move"
          aria-label="Open Dev Tools"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </motion.button>

        {/* Quarter Circle Menu - Only show tools that aren't dragged out */}
        <AnimatePresence>
          {isExpanded && (() => {
            const positions = getQuarterCirclePositions();
            const tools = getToolsConfig();
            
            return (
              <>
                {tools.map((tool, index) => {
                  const isDraggedOut = draggedOutTools[tool.toolId as keyof typeof draggedOutTools] !== undefined;
                  // Only show in quarter circle if not dragged out
                  if (isDraggedOut) return null;
                  
                  const toolPosition = positions[index];
                  
                  return (
                    <motion.button
                      key={tool.toolId}
                      data-tool-button
                      initial={{ 
                        opacity: 0, 
                        scale: 0,
                        x: position.x - toolPosition.x,
                        y: position.y - toolPosition.y,
                      }}
                      animate={{ 
                        opacity: tool.isOpen ? 0.4 : 1, 
                        scale: 1,
                        x: 0,
                        y: 0,
                      }}
                      exit={{ 
                        opacity: 0, 
                        scale: 0,
                        x: position.x - toolPosition.x,
                        y: position.y - toolPosition.y,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                        delay: index * 0.05,
                        opacity: { duration: 0.2, ease: "easeInOut" },
                      }}
                      onClick={() => {
                        // Simple click handler - no drag functionality for toolbar bubbles
                        if (!tool.disabled) {
                          tool.onClick();
                          // Keep toolbar open when modal opens
                          setIsExpanded(true);
                        }
                      }}
                      onMouseEnter={() => setHoveredTool(tool.toolId)}
                      onMouseLeave={() => setHoveredTool(null)}
                      className={`relative ${tool.color || 'bg-orange-600 hover:bg-orange-700'} rounded-full p-3 transition-colors flex items-center justify-center shadow-lg ${
                        tool.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      style={{
                        position: 'fixed',
                        left: `${toolPosition.x}px`,
                        top: `${toolPosition.y}px`,
                        zIndex: 10000,
                        cursor: tool.disabled ? 'not-allowed' : 'pointer',
                      }}
                      disabled={tool.disabled}
                      aria-label={tool.label}
                    >
                      {tool.icon}
                      {hoveredTool === tool.toolId && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none"
                          style={{
                            zIndex: 10001,
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: '8px',
                          }}
                        >
                          {tool.disabled ? 'Network Panel (Coming Soon)' : (tool.isOpen ? `Hide ${tool.label}` : `Show ${tool.label}`)}
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </>
            );
          })()}
        </AnimatePresence>
      </motion.div>
      
      {/* Dragged Out Tools - Always visible, outside settings icon container */}
      {Object.entries(draggedOutTools).map(([toolId, toolPosition]) => {
        const tools = getToolsConfig();
        const tool = tools.find(t => t.toolId === toolId);
        if (!tool) return null;
        
        const isMinimized = minimizedPanels[toolId as keyof typeof minimizedPanels] !== undefined;
        
        // Don't render if modal is open (unless minimized)
        if (tool.isOpen && !isMinimized) {
          return null;
        }
        
        return (
          <motion.button
            key={`dragged-${toolId}`}
            data-tool-button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
            }}
            onMouseDown={(e) => {
              if (!tool.disabled) {
                // Only set dragging tool, but don't actually start drag until mouse moves
                setDraggingTool(tool.toolId);
                handleToolMouseDown(e, tool.toolId);
              }
            }}
            onClick={(e) => {
              // Check if we actually dragged (using ref which is set during mouse move)
              // The ref is set to true only if we moved beyond DRAG_THRESHOLD
              const hasDragged = toolHasDraggedRef.current[tool.toolId] === true;
              
              if (hasDragged) {
                // We dragged, don't trigger click
                e.stopPropagation();
                e.preventDefault();
                return;
              }
              
              // We didn't drag, this is a click - ensure ref is false and reset dragging tool state
              toolHasDraggedRef.current[tool.toolId] = false;
              if (draggingTool === tool.toolId) {
                setDraggingTool(null);
                setToolHasDragged(false);
              }
              
              if (isMinimized) {
                // Restore panel
                const panelKey = toolId === 'admin' ? 'adminPanelState' : toolId === 'storage' ? 'storageManagerPanelState' : toolId === 'featureFlags' ? 'featureFlagsPanelState' : 'networkPanelState';
                const saved = localStorage.getItem(panelKey);
                if (saved) {
                  try {
                    const parsed = JSON.parse(saved);
                    localStorage.setItem(panelKey, JSON.stringify({ ...parsed, minimized: false }));
                  } catch {}
                }
                setMinimizedPanels((prev) => {
                  const updated = { ...prev };
                  delete updated[toolId as keyof typeof updated];
                  return updated;
                });
                if (toolId === 'admin') {
                  setShowAdminPanel(false);
                  setTimeout(() => setShowAdminPanel(true), 0);
                } else if (toolId === 'storage') {
                  setShowStorageManager(false);
                  setTimeout(() => setShowStorageManager(true), 0);
                } else if (toolId === 'featureFlags') {
                  setShowFeatureFlags(false);
                  setTimeout(() => setShowFeatureFlags(true), 0);
                } else if (toolId === 'network') {
                  setShowNetworkPanel(false);
                  setTimeout(() => setShowNetworkPanel(true), 0);
                }
              } else if (!tool.disabled) {
                tool.onClick();
                // Keep toolbar open when modal opens
                setIsExpanded(true);
              }
            }}
            onMouseEnter={() => setHoveredTool(tool.toolId)}
            onMouseLeave={() => setHoveredTool(null)}
            className={`relative ${tool.color || 'bg-orange-600 hover:bg-orange-700'} rounded-full p-3 transition-colors flex items-center justify-center shadow-lg ${
              tool.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-move'
            }`}
            style={{
              position: 'fixed',
              left: `${toolPosition.x}px`,
              top: `${toolPosition.y}px`,
              zIndex: 10000,
              cursor: draggingTool === tool.toolId ? 'grabbing' : (tool.disabled ? 'not-allowed' : 'grab'),
            }}
            disabled={tool.disabled}
            aria-label={tool.label}
          >
            {tool.icon}
            {hoveredTool === tool.toolId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none"
                style={{
                  zIndex: 10001,
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginBottom: '8px',
                }}
              >
                {tool.disabled ? 'Network Panel (Coming Soon)' : (isMinimized ? `Restore ${tool.label}` : (tool.isOpen ? `Hide ${tool.label}` : `Show ${tool.label}`))}
              </motion.div>
            )}
          </motion.button>
        );
      })}

      {/* Admin Panel */}
      <AnimatePresence>
        {showAdminPanel && !minimizedPanels.admin && (
          <AdminPanel
            isOpen={showAdminPanel}
            onClose={() => {
              setShowAdminPanel(false);
              // Return bubble to toolbar
              setDraggedOutTools((prev) => {
                const updated = { ...prev };
                delete updated.admin;
                return updated;
              });
            }}
            onMinimizedChange={(minimized, pos) => {
              if (minimized) {
                // Move the tool bubble to the cursor position
                const bubbleX = lastMousePos.x - 24; // Adjust for button center
                const bubbleY = lastMousePos.y - 24;
                
                // If bubble is not already free roaming, make it free roaming
                setDraggedOutTools((prev) => ({
                  ...prev,
                  admin: { x: bubbleX, y: bubbleY },
                }));
                setMinimizedPanels((prev) => ({
                  ...prev,
                  admin: { minimized: true, position: pos },
                }));
              } else {
                setMinimizedPanels((prev) => ({
                  ...prev,
                  admin: undefined,
                }));
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Storage Manager Panel */}
      <AnimatePresence>
        {showStorageManager && !minimizedPanels.storage && (
          <StorageManagerPanel
            isOpen={showStorageManager}
            onClose={() => {
              setShowStorageManager(false);
              // Return bubble to toolbar
              setDraggedOutTools((prev) => {
                const updated = { ...prev };
                delete updated.storage;
                return updated;
              });
            }}
            onMinimizedChange={(minimized, pos) => {
              if (minimized) {
                // Move the tool bubble to the cursor position
                const bubbleX = lastMousePos.x - 24; // Adjust for button center
                const bubbleY = lastMousePos.y - 24;
                
                // If bubble is not already free roaming, make it free roaming
                setDraggedOutTools((prev) => ({
                  ...prev,
                  storage: { x: bubbleX, y: bubbleY },
                }));
                setMinimizedPanels((prev) => ({
                  ...prev,
                  storage: { minimized: true, position: pos },
                }));
              } else {
                setMinimizedPanels((prev) => ({
                  ...prev,
                  storage: undefined,
                }));
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Feature Flags Panel */}
      <AnimatePresence>
        {showFeatureFlags && !minimizedPanels.featureFlags && (
          <FeatureFlagsPanel
            isOpen={showFeatureFlags}
            onClose={() => {
              setShowFeatureFlags(false);
              // Return bubble to toolbar
              setDraggedOutTools((prev) => {
                const updated = { ...prev };
                delete updated.featureFlags;
                return updated;
              });
            }}
            onMinimizedChange={(minimized, pos) => {
              if (minimized) {
                // Move the tool bubble to the cursor position
                const bubbleX = lastMousePos.x - 24; // Adjust for button center
                const bubbleY = lastMousePos.y - 24;
                
                // If bubble is not already free roaming, make it free roaming
                setDraggedOutTools((prev) => ({
                  ...prev,
                  featureFlags: { x: bubbleX, y: bubbleY },
                }));
                setMinimizedPanels((prev) => ({
                  ...prev,
                  featureFlags: { minimized: true, position: pos },
                }));
              } else {
                setMinimizedPanels((prev) => ({
                  ...prev,
                  featureFlags: undefined,
                }));
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Network Panel */}
      <AnimatePresence>
        {showNetworkPanel && !minimizedPanels.network && (
          <NetworkPanel
            isOpen={showNetworkPanel}
            onClose={() => {
              setShowNetworkPanel(false);
              // Return bubble to toolbar
              setDraggedOutTools((prev) => {
                const updated = { ...prev };
                delete updated.network;
                return updated;
              });
            }}
            onMinimizedChange={(minimized, pos) => {
              if (minimized) {
                // Move the tool bubble to the cursor position
                const bubbleX = lastMousePos.x - 24; // Adjust for button center
                const bubbleY = lastMousePos.y - 24;
                
                // If bubble is not already free roaming, make it free roaming
                setDraggedOutTools((prev) => ({
                  ...prev,
                  network: { x: bubbleX, y: bubbleY },
                }));
                setMinimizedPanels((prev) => ({
                  ...prev,
                  network: { minimized: true, position: pos },
                }));
              } else {
                setMinimizedPanels((prev) => ({
                  ...prev,
                  network: undefined,
                }));
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Minimized panels use the dragged-out tool bubbles instead of separate MinimizedBubble components */}

    </>
  );
}

