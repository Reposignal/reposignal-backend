/**
 * Custom error classes for structured error handling
 */

export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // Setup errors
  SETUP_ALREADY_COMPLETED = 'SETUP_ALREADY_COMPLETED',
  SETUP_WINDOW_EXPIRED = 'SETUP_WINDOW_EXPIRED',
  INSTALLATION_INVALID = 'INSTALLATION_INVALID',

  // Business logic errors
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  DOMAIN_LIMIT_REACHED = 'DOMAIN_LIMIT_REACHED',
  FRAMEWORK_LIMIT_REACHED = 'FRAMEWORK_LIMIT_REACHED',
  TAG_LIMIT_REACHED = 'TAG_LIMIT_REACHED',
  LANGUAGE_LIMIT_REACHED = 'LANGUAGE_LIMIT_REACHED',

  // Authorization errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_PERMISSIONS = 'INVALID_PERMISSIONS',

  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  GITHUB_UNAVAILABLE = 'GITHUB_UNAVAILABLE',
}

export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, any>;
  };
}

export class AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: Record<string, any>;

  constructor(code: ErrorCode, message: string, statusCode: number = 400, details?: Record<string, any>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

// Specific error classes for common scenarios

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details);
    this.name = 'ValidationError';
  }
}

export class ResourceNotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier ? `${resource} not found: ${identifier}` : `${resource} not found`;
    super(ErrorCode.RESOURCE_NOT_FOUND, message, 404);
    this.name = 'ResourceNotFoundError';
  }
}

export class LimitExceededError extends AppError {
  constructor(resource: string, limit: number, current?: number) {
    const details: Record<string, any> = { resource, limit };
    if (current !== undefined) details.current = current;

    let message = `${resource} limit reached (max ${limit})`;
    if (current !== undefined) {
      message = `${resource} limit exceeded. Current: ${current}, Limit: ${limit}`;
    }

    let code: ErrorCode;
    if (resource.toLowerCase().includes('domain')) code = ErrorCode.DOMAIN_LIMIT_REACHED;
    else if (resource.toLowerCase().includes('framework')) code = ErrorCode.FRAMEWORK_LIMIT_REACHED;
    else if (resource.toLowerCase().includes('tag')) code = ErrorCode.TAG_LIMIT_REACHED;
    else if (resource.toLowerCase().includes('language')) code = ErrorCode.LANGUAGE_LIMIT_REACHED;
    else code = ErrorCode.LIMIT_EXCEEDED;

    super(code, message, 409, details);
    this.name = 'LimitExceededError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(ErrorCode.UNAUTHORIZED, message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(ErrorCode.FORBIDDEN, message, 403);
    this.name = 'ForbiddenError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.DATABASE_ERROR, message, 500, details);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: Record<string, any>) {
    super(ErrorCode.EXTERNAL_SERVICE_ERROR, `${service}: ${message}`, 503, details);
    this.name = 'ExternalServiceError';
  }
}

export class SetupAlreadyCompletedError extends AppError {
  constructor() {
    super(ErrorCode.SETUP_ALREADY_COMPLETED, 'Setup has already been completed for this installation', 409);
    this.name = 'SetupAlreadyCompletedError';
  }
}

export class SetupWindowExpiredError extends AppError {
  constructor() {
    super(ErrorCode.SETUP_WINDOW_EXPIRED, 'Setup window has expired for this installation', 410);
    this.name = 'SetupWindowExpiredError';
  }
}

export class InstallationInvalidError extends AppError {
  constructor(message: string = 'Installation is invalid or has been revoked') {
    super(ErrorCode.INSTALLATION_INVALID, message, 403);
    this.name = 'InstallationInvalidError';
  }
}

export class GitHubUnavailableError extends AppError {
  constructor(message: string = 'GitHub API is unavailable') {
    super(ErrorCode.GITHUB_UNAVAILABLE, message, 502);
    this.name = 'GitHubUnavailableError';
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert any error to an AppError if it isn't already
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(ErrorCode.INTERNAL_ERROR, error.message, 500);
  }

  return new AppError(ErrorCode.INTERNAL_ERROR, 'An unexpected error occurred', 500);
}
