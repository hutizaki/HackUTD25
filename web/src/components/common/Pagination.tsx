import type { PaginationData } from '@/lib/admin';

interface PaginationProps {
  pagination: PaginationData | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  itemName?: string; // e.g., "users", "permissions"
}

export function Pagination({ pagination, currentPage, onPageChange, itemName = 'items' }: PaginationProps) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const startItem = ((pagination.page - 1) * pagination.limit) + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-700 dark:text-gray-300">
        Showing {startItem} to {endItem} of {pagination.total} {itemName}
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!pagination.hasPrevPage}
          className={`px-4 py-2 rounded-md ${
            pagination.hasPrevPage
              ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
          }`}
        >
          Previous
        </button>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!pagination.hasNextPage}
          className={`px-4 py-2 rounded-md ${
            pagination.hasNextPage
              ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}

