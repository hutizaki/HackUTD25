export function handleApiError(error: unknown, defaultMessage = 'An error occurred'): string {
  if (error instanceof Error) {
    if (error.message.includes('403')) {
      return 'Admin endpoints only available in development environment';
    }
    if (error.message.includes('401')) {
      return 'Unauthorized. Please log in again.';
    }
    if (error.message.includes('404')) {
      return 'Resource not found.';
    }
    if (error.message.includes('429')) {
      return 'Too many requests. Please wait a moment before trying again.';
    }
    if (error.message.includes('500')) {
      return 'Server error. Please try again later.';
    }
    return error.message || defaultMessage;
  }
  return defaultMessage;
}

