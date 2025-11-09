import type { PaginationData } from '@/lib/admin';
interface PaginationProps {
    pagination: PaginationData | null;
    currentPage: number;
    onPageChange: (page: number) => void;
    itemName?: string;
}
export declare function Pagination({ pagination, currentPage, onPageChange, itemName }: PaginationProps): import("react/jsx-runtime").JSX.Element | null;
export {};
