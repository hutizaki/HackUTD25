import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCollectionDocuments, deleteCollectionDocument, type PaginationData } from '@/lib/admin';
import { DocumentModal } from './DocumentModal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { handleApiError } from '@/lib/errorHandling';

interface CollectionModalProps {
  collectionName: string;
  documentCount: number;
  onClose: () => void;
}

interface CollectionDocuments {
  documents: Record<string, unknown>[];
  pagination: PaginationData | null;
  loading: boolean;
  error: string | null;
}

export function CollectionModal({ collectionName, documentCount, onClose }: CollectionModalProps) {
  const [collectionData, setCollectionData] = useState<CollectionDocuments>({
    documents: [],
    pagination: null,
    loading: true,
    error: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDocument, setSelectedDocument] = useState<Record<string, unknown> | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<Record<string, unknown> | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadDocuments(1);
  }, [collectionName]);

  const loadDocuments = async (page: number) => {
    try {
      setCollectionData((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      const response = await getCollectionDocuments(collectionName, page, 20);
      
      setCollectionData({
        documents: response.data,
        pagination: response.pagination,
        loading: false,
        error: null,
      });
      setCurrentPage(page);
    } catch (err) {
      setCollectionData((prev) => ({
        ...prev,
        loading: false,
        error: handleApiError(err, 'Failed to load documents'),
      }));
    }
  };

  const handleDelete = async () => {
    if (!deletingDocument) return;

    try {
      setDeleting(true);
      const docId = deletingDocument.id || deletingDocument._id;
      if (!docId) {
        throw new Error('Document ID not found');
      }

      await deleteCollectionDocument(collectionName, String(docId));
      setDeletingDocument(null);
      await loadDocuments(currentPage);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Modal Overlay */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white font-mono">{collectionName}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {documentCount >= 0 ? `${documentCount} document${documentCount !== 1 ? 's' : ''}` : 'Error getting count'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {collectionData.loading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="md" />
                </div>
              ) : collectionData.error ? (
                <ErrorDisplay error={collectionData.error} />
              ) : collectionData.documents.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">No documents found</p>
              ) : (
                <div className="space-y-3">
                  {collectionData.documents.map((doc, idx) => {
                    const docId = typeof doc.id === 'string' ? doc.id : typeof doc._id === 'string' ? doc._id : `doc-${idx}`;
                    const previewFields = Object.entries(doc).filter(([key]) => key !== 'id' && key !== '_id').slice(0, 3);
                    
                    return (
                      <div
                        key={docId}
                        className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                              <span className="text-gray-500 dark:text-gray-400">ID:</span>{' '}
                              <span className="font-mono text-xs">{String(docId)}</span>
                            </div>
                            <div className="space-y-1">
                              {previewFields.map(([key, value]) => (
                                <div key={key} className="text-xs text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">{key}:</span>{' '}
                                  <span className="font-mono">
                                    {typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : String(value).substring(0, 50)}
                                  </span>
                                </div>
                              ))}
                              {Object.keys(doc).filter((key) => key !== 'id' && key !== '_id').length > 3 && (
                                <div className="text-xs text-gray-500 dark:text-gray-500 italic">
                                  +{Object.keys(doc).filter((key) => key !== 'id' && key !== '_id').length - 3} more field{Object.keys(doc).filter((key) => key !== 'id' && key !== '_id').length - 3 !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDocument(doc);
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              title="Edit Document"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingDocument(doc);
                              }}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Delete Document"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer with Pagination */}
            {collectionData.pagination && collectionData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing {((currentPage - 1) * collectionData.pagination.limit) + 1} to{' '}
                  {Math.min(currentPage * collectionData.pagination.limit, collectionData.pagination.total)} of {collectionData.pagination.total} documents
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => loadDocuments(currentPage - 1)}
                    disabled={!collectionData.pagination!.hasPrevPage}
                    className={`px-3 py-1 rounded-md text-sm ${
                      collectionData.pagination!.hasPrevPage
                        ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {currentPage} of {collectionData.pagination!.totalPages}
                  </span>
                  <button
                    onClick={() => loadDocuments(currentPage + 1)}
                    disabled={!collectionData.pagination!.hasNextPage}
                    className={`px-3 py-1 rounded-md text-sm ${
                      collectionData.pagination!.hasNextPage
                        ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Document Edit Modal */}
      {selectedDocument && (
        <DocumentModal
          collectionName={collectionName}
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onUpdate={() => {
            loadDocuments(currentPage);
            setSelectedDocument(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delete Document</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete this document? This action cannot be undone.
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Document ID:</p>
              <p className="text-sm font-mono text-gray-900 dark:text-white">
                {String(deletingDocument.id || deletingDocument._id || 'Unknown')}
              </p>
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setDeletingDocument(null)}
                disabled={deleting}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {deleting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
