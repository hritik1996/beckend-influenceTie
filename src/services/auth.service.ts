import { UserRepository } from '../repositories/user.repository';
import { AppError } from '../utils/appError';
import { ERROR_CODES, MESSAGES } from '../constants';
import { hashPassword, verifyPassword, createJWTPayload, generateJWT, generateOTP, generateOTPExpiry, isOTPExpired } from '../utils/auth';

export class AuthService {
  constructor(private readonly users: UserRepository = new UserRepository()) {}

  async register(data: {
    email: string; password: string; firstName: string; lastName: string;
    phone?: string | null; role: string; companyName?: string | null; instagramHandle?: string | null;
  }) {
    const dup = await this.users.findDuplicates(data.email, data.phone, data.instagramHandle);
    if (dup.length > 0) {
      const existing = dup[0];
      if (existing.email === data.email) throw new AppError(MESSAGES.EMAIL_ALREADY_EXISTS, ERROR_CODES.EMAIL_ALREADY_EXISTS, 409);
      if (existing.phone && existing.phone === data.phone) throw new AppError(MESSAGES.PHONE_ALREADY_EXISTS, ERROR_CODES.PHONE_ALREADY_EXISTS, 409);
      if (existing.instagram_handle && existing.instagram_handle === data.instagramHandle) throw new AppError(MESSAGES.INSTAGRAM_ALREADY_EXISTS, ERROR_CODES.INSTAGRAM_ALREADY_EXISTS, 409);
    }

    const password = await hashPassword(data.password);
    const otp = generateOTP();
    const otpExpiry = generateOTPExpiry();
    const created = await this.users.createUser({ ...data, password, otp, otpExpiry });

    const payload = createJWTPayload({ id: created.id, email: created.email, role: created.role });
    const token = generateJWT(payload);

    return { user: created, token, otpSent: true };
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new AppError(MESSAGES.INVALID_CREDENTIALS, ERROR_CODES.INVALID_CREDENTIALS, 401);

    const ok = await verifyPassword(password, user.password!);
    if (!ok) throw new AppError(MESSAGES.INVALID_CREDENTIALS, ERROR_CODES.INVALID_CREDENTIALS, 401);

    await this.users.setLastLogin(user.id);
    const payload = createJWTPayload({ id: user.id, email: user.email, role: user.role });
    const token = generateJWT(payload);
    const { password: _p, ...userWithoutPassword } = user as any;
    return { user: userWithoutPassword, token };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.users.getByEmailForOtp(email);
    if (!user) throw new AppError(MESSAGES.USER_NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, 404);
    if (!user.otp || !user.otp_expiry) throw new AppError(MESSAGES.INVALID_OTP, ERROR_CODES.INVALID_OTP, 400);
    if (isOTPExpired(new Date(user.otp_expiry))) throw new AppError(MESSAGES.OTP_EXPIRED, ERROR_CODES.OTP_EXPIRED, 400);
    if (user.otp !== otp) throw new AppError(MESSAGES.INVALID_OTP, ERROR_CODES.INVALID_OTP, 400);
    await this.users.verifyEmail(user.id);
    return { verified: true };
  }

  async resendOtp(email: string) {
    const user = await this.users.getByEmailForOtp(email);
    if (!user) throw new AppError(MESSAGES.USER_NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, 404);
    if (user.is_email_verified) return { message: 'Email already verified' };
    const otp = generateOTP();
    const otpExpiry = generateOTPExpiry();
    await this.users.updateOtp(user.id, otp, otpExpiry);
    return { sent: true };
  }

  async requestPasswordReset(email: string) {
    const user = await this.users.getByEmailForOtp(email);
    if (!user) throw new AppError(MESSAGES.USER_NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, 404);
    const otp = generateOTP();
    const otpExpiry = generateOTPExpiry();
    await this.users.updateOtp(user.id, otp, otpExpiry);
    return { sent: true };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = await this.users.getByEmailForOtp(email);
    if (!user) throw new AppError(MESSAGES.USER_NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, 404);
    if (!user.otp || !user.otp_expiry) throw new AppError(MESSAGES.INVALID_OTP, ERROR_CODES.INVALID_OTP, 400);
    if (isOTPExpired(new Date(user.otp_expiry))) throw new AppError(MESSAGES.OTP_EXPIRED, ERROR_CODES.OTP_EXPIRED, 400);
    if (user.otp !== otp) throw new AppError(MESSAGES.INVALID_OTP, ERROR_CODES.INVALID_OTP, 400);
    const hashed = await hashPassword(newPassword);
    await this.users.updatePassword(user.id, hashed);
    await this.users.clearOtp(user.id);
    return { reset: true };
  }
}


