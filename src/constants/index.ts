// Centralized constants for codes, messages, strings and enums

export const APP = {
  NAME: 'InfluenceTie',
} as const;

export const ROLES = {
  INFLUENCER: 'INFLUENCER',
  BRAND: 'BRAND',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  PHONE_ALREADY_EXISTS: 'PHONE_ALREADY_EXISTS',
  INSTAGRAM_ALREADY_EXISTS: 'INSTAGRAM_ALREADY_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_OTP: 'INVALID_OTP',
  OTP_EXPIRED: 'OTP_EXPIRED',
} as const;

export const MESSAGES = {
  SUCCESS: 'Success',
  INTERNAL_ERROR: 'Internal server error',
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  PHONE_ALREADY_EXISTS: 'Phone number already exists',
  INSTAGRAM_ALREADY_EXISTS: 'Instagram handle already exists',
  USER_NOT_FOUND: 'User not found',
  INVALID_OTP: 'Invalid or expired OTP',
  OTP_EXPIRED: 'OTP has expired',
  VALIDATION_ERROR: 'Validation failed',
} as const;

export const DEFAULTS = {
  PAGINATION_LIMIT: 10,
} as const;

export const API = {
  BASE_PATH: '/api',
  CURRENT_VERSION: 'v1',
} as const;


