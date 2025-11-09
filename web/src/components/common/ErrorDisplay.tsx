interface ErrorDisplayProps {
  error: string | null;
  className?: string;
  variant?: 'error' | 'warning' | 'info';
}

export function ErrorDisplay({ error, className = '', variant = 'error' }: ErrorDisplayProps) {
  if (!error) return null;

  const variantClasses = {
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
  };

  return (
    <div className={`${variantClasses[variant]} border px-4 py-3 rounded-md ${className}`}>
      {error}
    </div>
  );
}

