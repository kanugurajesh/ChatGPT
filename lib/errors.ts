/**
 * Centralized error handling system
 */

export enum ErrorCode {
  // Authentication errors
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INVALID_USER = 'INVALID_USER',
  
  // Database errors
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED = 'DATABASE_QUERY_FAILED',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  DUPLICATE_DOCUMENT = 'DUPLICATE_DOCUMENT',
  
  // API errors
  INVALID_REQUEST = 'INVALID_REQUEST',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  EXTERNAL_API_FAILED = 'EXTERNAL_API_FAILED',
  
  // Chat errors
  CHAT_NOT_FOUND = 'CHAT_NOT_FOUND',
  MESSAGE_SEND_FAILED = 'MESSAGE_SEND_FAILED',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  
  // Memory errors
  MEMORY_SERVICE_UNAVAILABLE = 'MEMORY_SERVICE_UNAVAILABLE',
  MEMORY_SEARCH_FAILED = 'MEMORY_SEARCH_FAILED',
  
  // File errors
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
  
  // Generic errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  context?: Record<string, any>;
  originalError?: Error;
  statusCode?: number;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: Record<string, any>;
  public readonly originalError?: Error;
  public readonly statusCode: number;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'AppError';
    this.code = details.code;
    this.context = details.context;
    this.originalError = details.originalError;
    this.statusCode = details.statusCode || 500;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      statusCode: this.statusCode,
      stack: this.stack,
    };
  }
}

/**
 * Error factory functions for common error types
 */
export const createError = {
  authentication: (message = 'Authentication required'): AppError =>
    new AppError({
      code: ErrorCode.AUTHENTICATION_REQUIRED,
      message,
      statusCode: 401,
    }),

  invalidUser: (userId?: string): AppError =>
    new AppError({
      code: ErrorCode.INVALID_USER,
      message: 'Invalid or unauthorized user',
      context: { userId },
      statusCode: 403,
    }),

  databaseConnection: (originalError?: Error): AppError =>
    new AppError({
      code: ErrorCode.DATABASE_CONNECTION_FAILED,
      message: 'Failed to connect to database',
      originalError,
      statusCode: 503,
    }),

  chatNotFound: (chatId: string): AppError =>
    new AppError({
      code: ErrorCode.CHAT_NOT_FOUND,
      message: 'Chat not found or access denied',
      context: { chatId },
      statusCode: 404,
    }),

  invalidRequest: (message = 'Invalid request'): AppError =>
    new AppError({
      code: ErrorCode.INVALID_REQUEST,
      message,
      statusCode: 400,
    }),

  missingFields: (fields: string[]): AppError =>
    new AppError({
      code: ErrorCode.MISSING_REQUIRED_FIELDS,
      message: `Missing required fields: ${fields.join(', ')}`,
      context: { missingFields: fields },
      statusCode: 400,
    }),

  memoryServiceUnavailable: (originalError?: Error): AppError =>
    new AppError({
      code: ErrorCode.MEMORY_SERVICE_UNAVAILABLE,
      message: 'Memory service is not available',
      originalError,
      statusCode: 503,
    }),

  fileUploadFailed: (filename?: string, originalError?: Error): AppError =>
    new AppError({
      code: ErrorCode.FILE_UPLOAD_FAILED,
      message: 'File upload failed',
      context: { filename },
      originalError,
      statusCode: 400,
    }),

  internal: (message = 'Internal server error', originalError?: Error): AppError =>
    new AppError({
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message,
      originalError,
      statusCode: 500,
    }),
};

/**
 * Error handler for API routes
 */
export function handleApiError(error: unknown): {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  status: number;
} {
  if (error instanceof AppError) {
    console.error('AppError:', error.toJSON());
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.context,
      },
      status: error.statusCode,
    };
  }

  if (error instanceof Error) {
    console.error('Unhandled Error:', error.message, error.stack);
    return {
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      },
      status: 500,
    };
  }

  console.error('Unknown error:', error);
  return {
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
    },
    status: 500,
  };
}

/**
 * Utility function to check if an error is a specific type
 */
export function isErrorCode(error: unknown, code: ErrorCode): error is AppError {
  return error instanceof AppError && error.code === code;
}

/**
 * Retry utility with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}