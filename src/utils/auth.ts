import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Password verification
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// JWT token generation
export function generateJWT(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

// JWT token verification
export function verifyJWT(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Generate OTP
export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// Generate OTP expiry (5 minutes from now)
export function generateOTPExpiry(): Date {
  return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
}

// Check if OTP is expired
export function isOTPExpired(expiry: Date): boolean {
  return new Date() > expiry;
}

// Generate JWT payload for user
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export function createJWTPayload(user: { id: string; email: string; role: string }): JWTPayload {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
}
