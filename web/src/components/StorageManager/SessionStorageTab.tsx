import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  getAllSessionStorageItems,
  setSessionStorageItem,
  deleteSessionStorageItem,
  clearSessionStorage,
  getSessionStorageSize,
  formatBytes,
  formatJSON,
  type SessionStorageItem,
} from '@/lib/storage';

interface SessionStorageTabProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function SessionStorageTab({ searchTerm, onSearchChange }: SessionStorageTabProps) {
  const [items, setItems] = useState<SessionStorageItem[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
    // Auto-refresh every 2 seconds
    const interval = setInterval(loadItems, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadItems = () => {
    setItems(getAllSessionStorageItems());
  };

  const handleDelete = (key: string) => {
    if (confirm(`Are you sure you want to delete "${key}"?`)) {
      try {
        deleteSessionStorageItem(key);
        loadItems();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete item');
        setTimeout(() => setError(null), 3000);
      }
    }
  };

  const handleEdit = (item: SessionStorageItem) => {
    setEditingKey(item.key);
    setEditingValue(item.value);
  };

  const handleSaveEdit = () => {
    if (!editingKey) return;
    try {
      setSessionStorageItem(editingKey, editingValue);
      setEditingKey(null);
      setEditingValue('');
      loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAdd = () => {
    if (!newKey.trim()) {
      setError('Key is required');
      setTimeout(() => setError(null), 3000);
      return;
    }
    try {
      setSessionStorageItem(newKey, newValue);
      setNewKey('');
      setNewValue('');
      setShowAddForm(false);
      loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all Session Storage? This action cannot be undone.')) {
      try {
        clearSessionStorage();
        loadItems();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to clear storage');
        setTimeout(() => setError(null), 3000);
      }
    }
  };

  const handleCopyValue = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredItems = items.filter(
    (item) =>
      item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSize = getSessionStorageSize();

  return (
    <div className="space-y-4">
      {/* Warning */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 text-sm text-yellow-800 dark:text-yellow-300">
        <p className="font-semibold mb-1">Note:</p>
        <p>Session Storage is cleared when the browser tab is closed.</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by key or value..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm transition-colors"
          >
            {showAddForm ? 'Cancel' : '+ Add Item'}
          </button>
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={loadItems}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-blue-800 dark:text-blue-300">
            <strong>{items.length}</strong> item{items.length !== 1 ? 's' : ''} • Total size: <strong>{formatBytes(totalSize)}</strong>
          </span>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm"
        >
          <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Add New Item</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key *</label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                placeholder="item-key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <textarea
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                placeholder="item-value (JSON supported)"
              />
            </div>
            <button
              onClick={handleAdd}
              className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm transition-colors"
            >
              Add Item
            </button>
          </div>
        </motion.div>
      )}

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {searchTerm ? `No items found matching "${searchTerm}"` : 'No items in Session Storage'}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Showing {filteredItems.length} of {items.length} item{items.length !== 1 ? 's' : ''}
          </div>
          {filteredItems.map((item) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              {editingKey === item.key ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
                    <input
                      type="text"
                      value={editingKey}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-gray-100 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                    <textarea
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => {
                        setEditingKey(null);
                        setEditingValue('');
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white text-lg mb-1">{item.key}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 break-all font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded max-h-32 overflow-y-auto">
                        <pre className="whitespace-pre-wrap">{formatJSON(item.value)}</pre>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Size: {formatBytes(item.size)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleCopyValue(item.key, item.value)}
                        className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                        title="Copy value"
                      >
                        {copiedKey === item.key ? '✓ Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.key)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
