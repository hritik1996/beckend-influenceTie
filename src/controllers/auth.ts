import { Request, Response } from 'express';
import { query } from '../lib/database';
import { 
  registerSchema, 
  loginSchema, 
  otpSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
  RegisterInput,
  LoginInput,
  OtpInput,
  ResetPasswordRequestInput,
  ResetPasswordInput
} from '../schemas/auth';
import { 
  hashPassword, 
  verifyPassword, 
  generateJWT, 
  generateOTP, 
  generateOTPExpiry,
  isOTPExpired,
  createJWTPayload 
} from '../utils/auth';
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse,
  HTTP_STATUS,
  ERROR_MESSAGES 
} from '../utils/response';
import { ZodError, ZodIssue } from 'zod';
import {
  SELECT_USER_DUPLICATE_CHECK,
  INSERT_USER,
  SELECT_USER_BY_EMAIL_FOR_LOGIN,
  UPDATE_USER_LAST_LOGIN,
  SELECT_USER_EMAIL_OTP,
  UPDATE_USER_VERIFY_EMAIL,
  UPDATE_USER_SET_OTP,
} from '../queries/auth';
import { UPDATE_USER_CLEAR_OTP, UPDATE_USER_PASSWORD } from '../queries/auth';

// User Registration
export async function register(req: Request, res: Response) {
  try {
    // Validate input
    const validatedData: RegisterInput = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUserResult = await query(SELECT_USER_DUPLICATE_CHECK, [
      validatedData.email,
      validatedData.phone || null,
      validatedData.instagramHandle || null
    ]);

    if (existingUserResult.rows.length > 0) {
      const existingUser = existingUserResult.rows[0];
      if (existingUser.email === validatedData.email) {
        return errorResponse(res, ERROR_MESSAGES.EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
      if (existingUser.phone === validatedData.phone) {
        return errorResponse(res, ERROR_MESSAGES.PHONE_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
      if (existingUser.instagram_handle === validatedData.instagramHandle) {
        return errorResponse(res, ERROR_MESSAGES.INSTAGRAM_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);
    
    // Generate OTP for email verification
    const otp = generateOTP();
    const otpExpiry = generateOTPExpiry();

    // Create user
    const newUserResult = await query(INSERT_USER, [
      validatedData.email,
      hashedPassword,
      validatedData.firstName,
      validatedData.lastName,
      validatedData.phone || null,
      validatedData.role,
      validatedData.role === 'BRAND' ? (validatedData.companyName || null) : null,
      validatedData.instagramHandle || null,
      otp,
      otpExpiry
    ]);

    const newUser = newUserResult.rows[0];

    // Generate JWT token
    const jwtPayload = createJWTPayload({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role
    });
    const token = generateJWT(jwtPayload);

    // TODO: Send OTP via email (implement later)
    console.log(`OTP for ${validatedData.email}: ${otp}`);

    return successResponse(
      res,
      'User registered successfully. Please verify your email with the OTP sent.',
      {
        user: newUser,
        token,
        requiresEmailVerification: true
      },
      HTTP_STATUS.CREATED
    );

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof ZodError) {
      const errors: Record<string, string[]> = {};
      error.issues.forEach((issue: ZodIssue) => {
        const field = issue.path.join('.');
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(issue.message);
      });
      return validationErrorResponse(res, ERROR_MESSAGES.VALIDATION_ERROR, errors);
    }

    return errorResponse(
      res, 
      ERROR_MESSAGES.INTERNAL_ERROR, 
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

// User Login
export async function login(req: Request, res: Response) {
  try {
    // Validate input
    const validatedData: LoginInput = loginSchema.parse(req.body);
    
    // Find user by email
    const userResult = await query(SELECT_USER_BY_EMAIL_FOR_LOGIN, [validatedData.email]);

    if (userResult.rows.length === 0) {
      return errorResponse(res, ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    const user = userResult.rows[0];

    // Verify password
    const isPasswordValid = await verifyPassword(validatedData.password, user.password);
    if (!isPasswordValid) {
      return errorResponse(res, ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    // Update last login
    await query(UPDATE_USER_LAST_LOGIN, [user.id]);

    // Generate JWT token
    const jwtPayload = createJWTPayload({
      id: user.id,
      email: user.email,
      role: user.role
    });
    const token = generateJWT(jwtPayload);

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return successResponse(res, 'Login successful', {
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof ZodError) {
      const errors: Record<string, string[]> = {};
      error.issues.forEach((issue: ZodIssue) => {
        const field = issue.path.join('.');
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(issue.message);
      });
      return validationErrorResponse(res, ERROR_MESSAGES.VALIDATION_ERROR, errors);
    }

    return errorResponse(
      res, 
      ERROR_MESSAGES.INTERNAL_ERROR, 
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

// Verify OTP
export async function verifyOTP(req: Request, res: Response) {
  try {
    // Validate input
    const validatedData: OtpInput = otpSchema.parse(req.body);
    
    // Find user by email (phone support can be added similarly later)
    const userResult = await query(SELECT_USER_EMAIL_OTP, [validatedData.email]);

    if (userResult.rows.length === 0) {
      return errorResponse(res, ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const user = userResult.rows[0];

    if (!user.otp || !user.otp_expiry) {
      return errorResponse(res, ERROR_MESSAGES.INVALID_OTP, HTTP_STATUS.BAD_REQUEST);
    }

    // Check if OTP is expired
    if (isOTPExpired(new Date(user.otp_expiry))) {
      return errorResponse(res, ERROR_MESSAGES.OTP_EXPIRED, HTTP_STATUS.BAD_REQUEST);
    }

    // Verify OTP
    if (user.otp !== validatedData.otp) {
      return errorResponse(res, ERROR_MESSAGES.INVALID_OTP, HTTP_STATUS.BAD_REQUEST);
    }

    // Update user as email verified and clear OTP
    await query(UPDATE_USER_VERIFY_EMAIL, [user.id]);

    return successResponse(res, 'Email verified successfully');

  } catch (error) {
    console.error('OTP verification error:', error);
    
    if (error instanceof ZodError) {
      const errors: Record<string, string[]> = {};
      error.issues.forEach((issue: ZodIssue) => {
        const field = issue.path.join('.');
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(issue.message);
      });
      return validationErrorResponse(res, ERROR_MESSAGES.VALIDATION_ERROR, errors);
    }

    return errorResponse(
      res, 
      ERROR_MESSAGES.INTERNAL_ERROR, 
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

// Resend OTP
export async function resendOTP(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, 'Email is required', HTTP_STATUS.BAD_REQUEST);
    }

    // Find user
    const userResult = await query(SELECT_USER_EMAIL_OTP, [email]);

    if (userResult.rows.length === 0) {
      return errorResponse(res, ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const user = userResult.rows[0];

    if (user.is_email_verified) {
      return errorResponse(res, 'Email is already verified', HTTP_STATUS.BAD_REQUEST);
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = generateOTPExpiry();

    // Update user with new OTP
    await query(UPDATE_USER_SET_OTP, [otp, otpExpiry, user.id]);

    // TODO: Send OTP via email (implement later)
    console.log(`New OTP for ${email}: ${otp}`);

    return successResponse(res, 'OTP sent successfully');

  } catch (error) {
    console.error('Resend OTP error:', error);
    return errorResponse(
      res, 
      ERROR_MESSAGES.INTERNAL_ERROR, 
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

// Request password reset (send OTP to email)
export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const data: ResetPasswordRequestInput = resetPasswordRequestSchema.parse(req.body);
    const userResult = await query(SELECT_USER_EMAIL_OTP, [data.email]);
    if (userResult.rows.length === 0) {
      return errorResponse(res, ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    const user = userResult.rows[0];

    const otp = generateOTP();
    const otpExpiry = generateOTPExpiry();
    await query(UPDATE_USER_SET_OTP, [otp, otpExpiry, user.id]);
    return successResponse(res, 'Password reset OTP sent');
  } catch (error) {
    console.error('Request password reset error:', error);
    return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

// Reset password using OTP
export async function resetPassword(req: Request, res: Response) {
  try {
    const data: ResetPasswordInput = resetPasswordSchema.parse(req.body);
    const userResult = await query(SELECT_USER_EMAIL_OTP, [data.email]);
    if (userResult.rows.length === 0) {
      return errorResponse(res, ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    const user = userResult.rows[0];
    if (!user.otp || !user.otp_expiry) {
      return errorResponse(res, ERROR_MESSAGES.INVALID_OTP, HTTP_STATUS.BAD_REQUEST);
    }
    if (isOTPExpired(new Date(user.otp_expiry))) {
      return errorResponse(res, ERROR_MESSAGES.OTP_EXPIRED, HTTP_STATUS.BAD_REQUEST);
    }
    if (user.otp !== data.otp) {
      return errorResponse(res, ERROR_MESSAGES.INVALID_OTP, HTTP_STATUS.BAD_REQUEST);
    }

    const newHashed = await hashPassword(data.newPassword);
    await query(UPDATE_USER_PASSWORD, [newHashed, user.id]);
    await query(UPDATE_USER_CLEAR_OTP, [user.id]);
    return successResponse(res, 'Password reset successfully');
  } catch (error) {
    console.error('Reset password error:', error);
    return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}