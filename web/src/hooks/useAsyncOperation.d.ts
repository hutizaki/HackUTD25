interface UseAsyncOperationOptions {
    onError?: (error: Error) => string;
}
export declare function useAsyncOperation<T>(options?: UseAsyncOperationOptions): {
    loading: boolean;
    error: string | null;
    execute: (operation: () => Promise<T>) => Promise<T | null>;
    clearError: () => void;
};
export {};
