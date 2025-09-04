import { z } from 'zod';

// User registration schema
export const registerSchema = z.object({
  email: z
    .string()
    .email('Valid email address required')
    .min(1, 'Email is required'),
  
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters'),
  
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters'),
  
  phone: z
    .string()
    .regex(/^[+]?[1-9]\d{1,14}$/, 'Valid phone number required')
    .optional(),
  
  role: z
    .enum(['INFLUENCER', 'BRAND'], {
      errorMap: () => ({ message: 'Role must be either INFLUENCER or BRAND' })
    })
    .default('INFLUENCER'),
  
  // Optional fields for different user types
  companyName: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .optional(),
  
  instagramHandle: z
    .string()
    .regex(/^[a-zA-Z0-9_]{1,30}$/, 'Instagram handle must be valid (alphanumeric and underscore only)')
    .optional(),
});

// Login schema
export const loginSchema = z.object({
  email: z
    .string()
    .email('Valid email address required'),
  
  password: z
    .string()
    .min(1, 'Password is required'),
});

// OTP verification schema
export const otpSchema = z.object({
  email: z
    .string()
    .email('Valid email address required'),
  
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only numbers'),
});

// Password reset request schema
export const resetPasswordRequestSchema = z.object({
  email: z
    .string()
    .email('Valid email address required'),
});

// Password reset schema
export const resetPasswordSchema = z.object({
  email: z
    .string()
    .email('Valid email address required'),
  
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits'),
  
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
