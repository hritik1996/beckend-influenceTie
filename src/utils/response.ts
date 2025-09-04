import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

// Success response helper
export function successResponse<T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): Response<ApiResponse<T>> {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

// Error response helper
export function errorResponse(
  res: Response,
  message: string,
  statusCode: number = 400,
  error?: string
): Response<ApiResponse> {
  return res.status(statusCode).json({
    success: false,
    message,
    error,
  });
}

// Validation error response helper
export function validationErrorResponse(
  res: Response,
  message: string = 'Validation failed',
  errors: Record<string, string[]>,
  statusCode: number = 400
): Response<ApiResponse> {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

// Common HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Common error messages
export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  PHONE_ALREADY_EXISTS: 'Phone number already exists',
  INSTAGRAM_ALREADY_EXISTS: 'Instagram handle already exists',
  USER_NOT_FOUND: 'User not found',
  INVALID_OTP: 'Invalid or expired OTP',
  OTP_EXPIRED: 'OTP has expired',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  INTERNAL_ERROR: 'Internal server error',
  VALIDATION_ERROR: 'Validation failed',
} as const;
