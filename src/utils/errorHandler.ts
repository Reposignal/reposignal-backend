import type { Context } from 'hono';
import { AppError, isAppError, toAppError, ErrorCode } from './errors';

/**
 * Global error handler middleware for consistent error responses
 */
export function errorHandler(err: Error, c: Context) {
  // Convert to AppError if needed
  const appError = toAppError(err);

  // Log the error
  if (appError.statusCode >= 500) {
    console.error('Server error:', {
      code: appError.code,
      message: appError.message,
      stack: appError.stack,
      details: appError.details,
    });
  } else if (appError.statusCode >= 400) {
    console.warn('Client error:', {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    });
  }

  // Return structured error response
  return c.json(appError.toJSON(), appError.statusCode as any);
}

/**
 * Catch-all error handler for async route handlers
 * Wraps async handlers to catch unhandled promise rejections
 */
export function asyncHandler(handler: (c: Context) => Promise<Response>) {
  return async (c: Context) => {
    try {
      return await handler(c);
    } catch (err) {
      return errorHandler(err as Error, c);
    }
  };
}
