import { Request, Response } from 'express';
import { query } from '../lib/database';
import { 
  registerSchema, 
  loginSchema, 
  otpSchema,
  RegisterInput,
  LoginInput,
  OtpInput 
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
import { ZodError } from 'zod';

// User Registration
export async function register(req: Request, res: Response) {
  try {
    // Validate input
    const validatedData: RegisterInput = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUserQuery = `
      SELECT id, email, phone, instagram_handle 
      FROM users 
      WHERE email = $1 
         OR ($2::text IS NOT NULL AND phone = $2) 
         OR ($3::text IS NOT NULL AND instagram_handle = $3)
    `;
    
    const existingUserResult = await query(existingUserQuery, [
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
    const createUserQuery = `
      INSERT INTO users (
        email, password, first_name, last_name, phone, role, 
        company_name, instagram_handle, otp, otp_expiry
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, email, first_name, last_name, role, is_email_verified, created_at
    `;

    const newUserResult = await query(createUserQuery, [
      validatedData.email,
      hashedPassword,
      validatedData.firstName,
      validatedData.lastName,
      validatedData.phone || null,
      validatedData.role,
      validatedData.companyName || null,
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
      error.errors.forEach((err) => {
        const field = err.path.join('.');
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(err.message);
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
    const findUserQuery = `
      SELECT id, email, password, first_name, last_name, role, 
             is_email_verified, is_phone_verified
      FROM users 
      WHERE email = $1
    `;
    
    const userResult = await query(findUserQuery, [validatedData.email]);

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
    const updateLoginQuery = `
      UPDATE users 
      SET last_login_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `;
    await query(updateLoginQuery, [user.id]);

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
      error.errors.forEach((err) => {
        const field = err.path.join('.');
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(err.message);
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
    
    // Find user by email
    const findUserQuery = `
      SELECT id, email, otp, otp_expiry, is_email_verified
      FROM users 
      WHERE email = $1
    `;
    
    const userResult = await query(findUserQuery, [validatedData.email]);

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
    const updateUserQuery = `
      UPDATE users 
      SET is_email_verified = TRUE, otp = NULL, otp_expiry = NULL 
      WHERE id = $1
    `;
    await query(updateUserQuery, [user.id]);

    return successResponse(res, 'Email verified successfully');

  } catch (error) {
    console.error('OTP verification error:', error);
    
    if (error instanceof ZodError) {
      const errors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const field = err.path.join('.');
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(err.message);
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
    const findUserQuery = `
      SELECT id, email, is_email_verified
      FROM users 
      WHERE email = $1
    `;
    
    const userResult = await query(findUserQuery, [email]);

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
    const updateOtpQuery = `
      UPDATE users 
      SET otp = $1, otp_expiry = $2 
      WHERE id = $3
    `;
    await query(updateOtpQuery, [otp, otpExpiry, user.id]);

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