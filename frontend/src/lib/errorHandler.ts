/**
 * Error handling utilities for better user-facing error messages
 */

export interface ApiError {
  message?: string;
  statusCode?: number;
  error?: string;
}

/**
 * Extract user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  // Handle Axios/API errors
  if (error && typeof error === 'object') {
    const err = error as any;
    
    // Check for response data with message
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    
    // Check for response data with error field
    if (err.response?.data?.error) {
      return err.response.data.error;
    }
    
    // Handle specific HTTP status codes
    if (err.response?.status) {
      return getHttpErrorMessage(err.response.status);
    }
    
    // Handle network errors
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return 'Request timed out. Please check your internet connection and try again.';
    }
    
    if (err.code === 'ERR_NETWORK' || err.message?.toLowerCase().includes('network')) {
      return 'Network error. Please check your internet connection.';
    }
    
    // Check for standard Error object
    if (err.message) {
      return err.message;
    }
  }
  
  // Check if error is a string
  if (typeof error === 'string') {
    return error;
  }
  
  // Fallback for unknown errors
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Get user-friendly message for HTTP status codes
 */
function getHttpErrorMessage(status: number): string {
  const messages: Record<number, string> = {
    400: 'Invalid request. Please check your input and try again.',
    401: 'You are not authorized. Please log in again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    408: 'Request timed out. Please try again.',
    409: 'Conflict with existing data. Please refresh and try again.',
    422: 'Invalid data provided. Please check your input.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Server error. Please try again later.',
    502: 'Service temporarily unavailable. Please try again later.',
    503: 'Service temporarily unavailable. Please try again later.',
    504: 'Gateway timeout. Please try again later.',
  };
  
  return messages[status] || `Request failed with status ${status}. Please try again.`;
}

/**
 * Get context-specific error messages for common operations
 */
export function getOperationErrorMessage(operation: string, error: unknown): string {
  const baseMessage = getErrorMessage(error);
  
  const operationMessages: Record<string, string> = {
    login: 'Failed to log in',
    register: 'Failed to register account',
    logout: 'Failed to log out',
    'send-email': 'Failed to send email',
    'delete-email': 'Failed to delete email',
    'star-email': 'Failed to update star status',
    'mark-read': 'Failed to mark as read',
    'mark-unread': 'Failed to mark as unread',
    'archive-email': 'Failed to archive email',
    'load-emails': 'Failed to load emails',
    'load-labels': 'Failed to load labels',
    'create-column': 'Failed to create column',
    'update-column': 'Failed to update column',
    'delete-column': 'Failed to delete column',
    'move-email': 'Failed to move email',
    'snooze-email': 'Failed to snooze email',
    'generate-summary': 'Failed to generate AI summary',
    search: 'Search failed',
    'connect-gmail': 'Failed to connect Gmail account',
    sync: 'Failed to sync with Gmail',
  };
  
  const operationPrefix = operationMessages[operation] || 'Operation failed';
  
  // If the error message is generic, just return the operation-specific message
  if (baseMessage === 'An unexpected error occurred. Please try again.') {
    return `${operationPrefix}. ${baseMessage}`;
  }
  
  // If the error message already contains useful info, combine them
  return `${operationPrefix}: ${baseMessage}`;
}

/**
 * Check if error is a network/offline error
 */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  const err = error as any;
  return (
    err.code === 'ERR_NETWORK' ||
    err.code === 'ECONNABORTED' ||
    err.message?.toLowerCase().includes('network') ||
    err.message?.toLowerCase().includes('timeout') ||
    !navigator.onLine
  );
}

/**
 * Format error for logging (includes more technical details)
 */
export function formatErrorForLogging(error: unknown, context?: string): string {
  const contextStr = context ? `[${context}] ` : '';
  
  if (error && typeof error === 'object') {
    const err = error as any;
    
    const parts = [contextStr];
    
    if (err.response?.status) {
      parts.push(`Status: ${err.response.status}`);
    }
    
    if (err.config?.url) {
      parts.push(`URL: ${err.config.url}`);
    }
    
    if (err.message) {
      parts.push(`Message: ${err.message}`);
    }
    
    if (err.response?.data) {
      parts.push(`Data: ${JSON.stringify(err.response.data)}`);
    }
    
    return parts.join(' | ');
  }
  
  return `${contextStr}${String(error)}`;
}
