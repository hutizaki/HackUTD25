import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface MinimizedBubbleProps {
  icon: React.ReactNode;
  color: string;
  position: { x: number; y: number };
  onRestore: () => void;
  onClose: () => void;
  onPositionChange: (position: { x: number; y: number }) => void;
  tooltip: string;
}

export function MinimizedBubble({
  icon,
  color,
  position,
  onRestore,
  onClose,
  onPositionChange,
  tooltip,
}: MinimizedBubbleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const positionChangeRef = useRef(onPositionChange);
  const initialPositionRef = useRef(position);

  // Keep callback ref updated
  useEffect(() => {
    positionChangeRef.current = onPositionChange;
  }, [onPositionChange]);

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!bubbleRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setHasDragged(false);
    // Capture initial position and mouse position at drag start
    initialPositionRef.current = { ...position };
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    });
  };

  // Handle drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setHasDragged(true);
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      const newX = initialPositionRef.current.x + deltaX;
      const newY = initialPositionRef.current.y + deltaY;

      // Keep within viewport bounds
      const iconSize = 48;
      const maxX = window.innerWidth - iconSize;
      const maxY = window.innerHeight - iconSize;

      const clampedPosition = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      };

      positionChangeRef.current(clampedPosition);
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

  const handleClick = () => {
    // Prevent restore if user was dragging
    if (hasDragged) {
      setHasDragged(false);
      return;
    }
    onRestore();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <motion.div
      ref={bubbleRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 10001,
      }}
      className="relative"
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={isDragging ? {} : { scale: 0.9 }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleMouseDown(e);
        }}
        onClick={handleClick}
        className={`${color} text-white rounded-full p-3 shadow-lg transition-colors relative group`}
        aria-label={tooltip}
        style={{ 
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {icon}
        {/* Close button */}
        <button
          onClick={handleClose}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
          aria-label="Close"
        >
          ×
        </button>
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
          {tooltip}
        </div>
      </motion.button>
    </motion.div>
  );
}

