interface TableColumn<T> {
    header: string;
    accessor: keyof T | ((item: T) => React.ReactNode);
    className?: string;
}
interface TableProps<T> {
    columns: TableColumn<T>[];
    data: T[];
    keyExtractor: (item: T) => string;
    emptyMessage?: string;
    onRowClick?: (item: T) => void;
}
export declare function Table<T>({ columns, data, keyExtractor, emptyMessage, onRowClick }: TableProps<T>): import("react/jsx-runtime").JSX.Element;
export {};
