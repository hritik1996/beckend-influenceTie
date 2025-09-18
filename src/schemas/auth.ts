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
  
  // For influencer: first/last required. For brand: optional.
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters')
    .optional(),
  
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters')
    .optional(),

  // Optional full name (frontend may send this instead of first/last)
  fullName: z.string().min(2).max(100).optional(),
  
  phone: z
    .string()
    .regex(/^[+]?[1-9]\d{1,14}$/, 'Valid phone number required')
    .optional(),
  
  role: z.enum(['INFLUENCER', 'BRAND']).default('INFLUENCER'),
  
  // Optional fields for different user types
  companyName: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .optional(),
  
  instagramHandle: z
    .string()
    .regex(/^[a-zA-Z0-9_]{1,30}$/, 'Instagram handle must be valid (alphanumeric and underscore only)')
    .optional(),
})
  .refine((data) => data.role !== 'BRAND' || !!data.companyName, {
  path: ['companyName'],
  message: 'Company name is required for brand accounts',
})
  .refine((data) => {
    if (data.role === 'INFLUENCER') {
      return !!(data.firstName && data.lastName) || !!data.fullName;
    }
    return true;
  }, {
    path: ['firstName'],
    message: 'First and last name (or full name) are required for influencers',
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
  email: z.string().email('Valid email address required').optional(),
  phone: z.string().regex(/^[+]?[1-9]\d{1,14}$/, 'Valid phone number required').optional(),
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only numbers'),
}).refine((d) => !!d.email || !!d.phone, {
  message: 'Email or phone is required',
  path: ['email'],
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
