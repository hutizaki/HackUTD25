import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateCollectionDocument } from '@/lib/admin';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { handleApiError } from '@/lib/errorHandling';

interface DocumentModalProps {
  collectionName: string;
  document: Record<string, unknown>;
  onClose: () => void;
  onUpdate: () => void;
}

export function DocumentModal({ collectionName, document, onClose, onUpdate }: DocumentModalProps) {
  const [editingFields, setEditingFields] = useState<Record<string, string>>(() => {
    const fields: Record<string, string> = {};
    Object.entries(document).forEach(([key, value]) => {
      if (key === 'id' || key === '_id') return; // Skip ID fields
      if (typeof value === 'object' && value !== null) {
        fields[key] = JSON.stringify(value, null, 2);
      } else {
        fields[key] = String(value);
      }
    });
    return fields;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Parse the edited fields back to their original types
      const updatedDocument: Record<string, unknown> = {};
      Object.entries(editingFields).forEach(([key, value]) => {
        if (!value.trim()) return; // Skip empty fields
        try {
          // Try to parse as JSON first
          updatedDocument[key] = JSON.parse(value);
        } catch {
          // If not valid JSON, keep as string
          updatedDocument[key] = value;
        }
      });

      const docId = document.id || document._id;
      if (!docId) {
        throw new Error('Document ID not found');
      }

      await updateCollectionDocument(collectionName, String(docId), updatedDocument);
      onUpdate();
    } catch (err) {
      setError(handleApiError(err, 'Failed to update document'));
    } finally {
      setSaving(false);
    }
  };

  const handleFieldEdit = (key: string, value: string) => {
    setEditingFields((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAddField = () => {
    const newKey = `newField_${Date.now()}`;
    setEditingFields((prev) => ({
      ...prev,
      [newKey]: '',
    }));
    setExpandedFields((prev) => new Set([...prev, newKey]));
  };

  const handleDeleteField = (key: string) => {
    setEditingFields((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
    setExpandedFields((prev) => {
      const updated = new Set(prev);
      updated.delete(key);
      return updated;
    });
  };

  const toggleFieldExpand = (key: string) => {
    setExpandedFields((prev) => {
      const updated = new Set(prev);
      if (updated.has(key)) {
        updated.delete(key);
      } else {
        updated.add(key);
      }
      return updated;
    });
  };

  const formatValue = (value: unknown): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const isComplexValue = (value: unknown): boolean => {
    return typeof value === 'object' && value !== null;
  };

  const docId: string | undefined = document.id ? String(document.id) : document._id ? String(document._id) : undefined;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-[55] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Document</h2>
              <div className="mt-1 flex items-center space-x-3 text-sm">
                <span className="text-gray-600 dark:text-gray-400">Collection:</span>
                <span className="font-mono text-gray-900 dark:text-white">{collectionName}</span>
                {docId && (
                  <>
                    <span className="text-gray-400 dark:text-gray-600">•</span>
                    <span className="text-gray-600 dark:text-gray-400">ID:</span>
                    <span className="font-mono text-gray-900 dark:text-white">{docId}</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && <ErrorDisplay error={error} className="mb-4 text-sm" />}

            <div className="space-y-4">
              {Object.entries(editingFields).map(([key, value]) => {
                const originalValue = document[key];
                const isComplex = isComplexValue(originalValue);
                const isExpanded = expandedFields.has(key);
                const displayValue = isComplex && !isExpanded 
                  ? JSON.stringify(originalValue).substring(0, 100) + '...'
                  : formatValue(originalValue);

                return (
                  <div key={key} className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">
                          {key}
                        </label>
                        {isComplex && (
                          <button
                            onClick={() => toggleFieldExpand(key)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                          >
                            {isExpanded ? 'Show compact' : 'Show full value'}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteField(key)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete field"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <textarea
                      value={value}
                      onChange={(e) => handleFieldEdit(key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white font-mono resize-y"
                      rows={isComplex ? (isExpanded ? 12 : 4) : 2}
                      placeholder={isComplex ? 'Enter JSON value' : 'Enter value'}
                    />
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Original:</span>{' '}
                      <span className="font-mono break-all">{displayValue}</span>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={handleAddField}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium flex items-center justify-center space-x-2 border-2 border-dashed border-gray-300 dark:border-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Field</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
