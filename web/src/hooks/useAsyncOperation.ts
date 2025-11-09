import { useState } from 'react';
import { handleApiError } from '@/lib/errorHandling';

interface UseAsyncOperationOptions {
  onError?: (error: Error) => string; // Custom error message handler
}

export function useAsyncOperation<T>(options?: UseAsyncOperationOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (operation: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await operation();
      return result;
    } catch (err) {
      let errorMessage = 'An error occurred';
      
      if (err instanceof Error) {
        if (options?.onError) {
          errorMessage = options.onError(err);
        } else {
          errorMessage = handleApiError(err);
        }
      }
      
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { loading, error, execute, clearError };
}

