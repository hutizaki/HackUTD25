import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { networkInterceptor } from '../lib/networkInterceptor';
import type { NetworkLog, NetworkLogFilter, HttpMethod } from '../types/network';

interface NetworkPanelProps {
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

const MIN_WIDTH = 600;
const MIN_HEIGHT = 400;
const DEFAULT_WIDTH = 1000;
const DEFAULT_HEIGHT = 700;

export function NetworkPanel({ isOpen, onClose, onMinimizedChange }: NetworkPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, panelX: 0, panelY: 0 });
  
  const [logs, setLogs] = useState<NetworkLog[]>([]);
  const [filter, setFilter] = useState<NetworkLogFilter>({});
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'request' | 'response'>('request');
  
  const panelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Load saved state from localStorage
  const [panelState, setPanelState] = useState<PanelState>(() => {
    const saved = localStorage.getItem('networkPanelState');
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
    localStorage.setItem('networkPanelState', JSON.stringify(panelState));
  }, [panelState]);

  // Notify parent of minimized state changes
  useEffect(() => {
    if (onMinimizedChange) {
      onMinimizedChange(panelState.minimized, { x: panelState.x, y: panelState.y });
    }
  }, [panelState.minimized, panelState.x, panelState.y, onMinimizedChange]);

  // Subscribe to network logs
  useEffect(() => {
    const unsubscribe = networkInterceptor.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    // Load initial logs
    setLogs(networkInterceptor.getLogs());

    return unsubscribe;
  }, []);


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

  // Get filtered logs from state
  const filteredLogs = (() => {
    let filtered = [...logs];

    // Filter by method
    if (filter.method && filter.method !== 'ALL') {
      filtered = filtered.filter((log) => log.method === filter.method);
    }

    // Filter by status code
    if (filter.statusCode && filter.statusCode !== 'ALL') {
      filtered = filtered.filter((log) => log.responseStatus === filter.statusCode);
    }

    // Filter by search text (searches in URL)
    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      filtered = filtered.filter((log) => log.url.toLowerCase().includes(searchLower));
    }

    return filtered;
  })();

  // Get status color
  const getStatusColor = (status?: number) => {
    if (!status) return 'text-gray-500';
    if (status >= 200 && status < 300) return 'text-green-600 dark:text-green-400';
    if (status >= 400 && status < 500) return 'text-yellow-600 dark:text-yellow-400';
    if (status >= 500) return 'text-red-600 dark:text-red-400';
    return 'text-gray-500';
  };

  // Format response size
  const formatSize = (body: unknown): string => {
    if (!body) return '-';
    try {
      const size = JSON.stringify(body).length;
      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    } catch {
      return '-';
    }
  };

  // Format time
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error('Failed to copy:', err);
    });
  };

  // Generate cURL command
  const generateCurl = (log: NetworkLog): string => {
    let curl = `curl -X ${log.method} '${log.url}'`;
    
    // Add headers
    Object.entries(log.requestHeaders).forEach(([key, value]) => {
      curl += ` \\\n  -H '${key}: ${value}'`;
    });
    
    // Add body
    if (log.requestBody) {
      curl += ` \\\n  -d '${JSON.stringify(log.requestBody)}'`;
    }
    
    return curl;
  };

  // Hide panel when minimized, show bubble instead
  if (!isOpen || panelState.minimized) return null;

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
        className="bg-teal-600 text-white px-4 py-2 cursor-move flex items-center justify-between select-none"
      >
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold">Network Panel</h2>
          {panelState.minimized && (
            <span className="text-xs text-gray-300">(Minimized)</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPanelState((prev) => ({ ...prev, minimized: !prev.minimized }))}
            className="text-white hover:text-teal-200 transition-colors p-1"
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
            className="text-white hover:text-teal-200 transition-colors p-1"
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
          {/* Filters */}
          <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Method:</label>
              <select
                value={filter.method || 'ALL'}
                onChange={(e) => setFilter({ ...filter, method: e.target.value === 'ALL' ? undefined : (e.target.value as HttpMethod) })}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="ALL">All</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
                <option value="HEAD">HEAD</option>
                <option value="OPTIONS">OPTIONS</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
              <select
                value={filter.statusCode || 'ALL'}
                onChange={(e) => setFilter({ ...filter, statusCode: e.target.value === 'ALL' ? undefined : parseInt(e.target.value) })}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="ALL">All</option>
                <option value="200">2xx</option>
                <option value="400">4xx</option>
                <option value="500">5xx</option>
              </select>
            </div>
            <div className="flex items-center space-x-2 flex-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search:</label>
              <input
                type="text"
                value={filter.searchText || ''}
                onChange={(e) => setFilter({ ...filter, searchText: e.target.value || undefined })}
                placeholder="Search by URL..."
                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <button
              onClick={() => networkInterceptor.clearLogs()}
              className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
            >
              Clear Logs
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            {filteredLogs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <p>No network requests logged yet.</p>
              </div>
            ) : (
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-200 dark:bg-gray-700 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Method</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">URL</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Time</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Size</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <React.Fragment key={log.id}>
                        <tr
                          onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                          className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer ${
                            expandedLogId === log.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                          }`}
                        >
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              log.method === 'GET' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                              log.method === 'POST' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                              log.method === 'PUT' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                              log.method === 'PATCH' ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200' :
                              log.method === 'DELETE' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                              'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            }`}>
                              {log.method}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-mono text-xs truncate max-w-md" title={log.url}>
                            {log.url}
                          </td>
                          <td className={`px-4 py-2 font-semibold ${getStatusColor(log.responseStatus)}`}>
                            {log.responseStatus || (log.error ? 'Error' : '-')}
                          </td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                            {formatTime(log.timestamp)}
                          </td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                            {formatSize(log.responseBody)}
                          </td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                            {log.responseTime ? `${log.responseTime}ms` : '-'}
                          </td>
                        </tr>
                        {expandedLogId === log.id && (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 bg-gray-50 dark:bg-gray-800">
                              <div className="space-y-4">
                                {/* Tabs */}
                                <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700">
                                  <button
                                    onClick={() => setSelectedTab('request')}
                                    className={`px-4 py-2 text-sm font-medium ${
                                      selectedTab === 'request'
                                        ? 'border-b-2 border-gray-600 dark:border-gray-400 text-gray-900 dark:text-gray-100'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                  >
                                    Request
                                  </button>
                                  <button
                                    onClick={() => setSelectedTab('response')}
                                    className={`px-4 py-2 text-sm font-medium ${
                                      selectedTab === 'response'
                                        ? 'border-b-2 border-gray-600 dark:border-gray-400 text-gray-900 dark:text-gray-100'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                  >
                                    Response
                                  </button>
                                </div>

                                {/* Request Details */}
                                {selectedTab === 'request' && (
                                  <div className="space-y-4">
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">URL</h4>
                                        <button
                                          onClick={() => copyToClipboard(log.url)}
                                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                          Copy
                                        </button>
                                      </div>
                                      <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded font-mono text-xs overflow-x-auto">
                                        {log.url}
                                      </div>
                                    </div>
                                    {Object.keys(log.queryParams || {}).length > 0 && (
                                      <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Query Parameters</h4>
                                        <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded">
                                          <pre className="text-xs overflow-x-auto">
                                            {JSON.stringify(log.queryParams, null, 2)}
                                          </pre>
                                        </div>
                                      </div>
                                    )}
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Headers</h4>
                                        <button
                                          onClick={() => copyToClipboard(JSON.stringify(log.requestHeaders, null, 2))}
                                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                          Copy
                                        </button>
                                      </div>
                                      <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded">
                                        <pre className="text-xs overflow-x-auto">
                                          {JSON.stringify(log.requestHeaders, null, 2)}
                                        </pre>
                                      </div>
                                    </div>
                                    {log.requestBody !== undefined && log.requestBody !== null && (
                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Body</h4>
                                          <div className="space-x-2">
                                            <button
                                              onClick={() => copyToClipboard(JSON.stringify(log.requestBody, null, 2))}
                                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                              Copy JSON
                                            </button>
                                            <button
                                              onClick={() => copyToClipboard(generateCurl(log))}
                                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                              Copy cURL
                                            </button>
                                          </div>
                                        </div>
                                        <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded">
                                          <pre className="text-xs overflow-x-auto">
                                            {String(JSON.stringify(log.requestBody, null, 2))}
                                          </pre>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Response Details */}
                                {selectedTab === 'response' && (
                                  <div className="space-y-4">
                                    {log.responseStatus && (
                                      <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Status</h4>
                                        <div className={`inline-block px-3 py-1 rounded font-semibold ${getStatusColor(log.responseStatus)}`}>
                                          {log.responseStatus}
                                        </div>
                                      </div>
                                    )}
                                    {log.responseHeaders && Object.keys(log.responseHeaders).length > 0 && (
                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Headers</h4>
                                          <button
                                            onClick={() => copyToClipboard(JSON.stringify(log.responseHeaders, null, 2))}
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                          >
                                            Copy
                                          </button>
                                        </div>
                                        <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded">
                                          <pre className="text-xs overflow-x-auto">
                                            {JSON.stringify(log.responseHeaders, null, 2)}
                                          </pre>
                                        </div>
                                      </div>
                                    )}
                                    {log.responseBody !== undefined && log.responseBody !== null && (
                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Body</h4>
                                          <button
                                            onClick={() => copyToClipboard(JSON.stringify(log.responseBody, null, 2))}
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                          >
                                            Copy JSON
                                          </button>
                                        </div>
                                        <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded">
                                          <pre className="text-xs overflow-x-auto">
                                            {String(JSON.stringify(log.responseBody, null, 2))}
                                          </pre>
                                        </div>
                                      </div>
                                    )}
                                    {log.error && (
                                      <div>
                                        <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">Error</h4>
                                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded text-red-800 dark:text-red-200">
                                          {log.error}
                                        </div>
                                      </div>
                                    )}
                                    {log.responseTime && (
                                      <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Timing</h4>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                          Response Time: {log.responseTime}ms
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                <div ref={logsEndRef} />
              </div>
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
            onMouseDown={(e) => handleResizeStart(e, 'bottom')}
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

