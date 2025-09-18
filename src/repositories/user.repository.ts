import { query } from '../lib/database';

export interface UserRecord {
  id: string;
  email: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  role: string;
  is_email_verified?: boolean;
}

export class UserRepository {
  async findByEmail(email: string) {
    const sql = `SELECT id, email, password, first_name, last_name, role, is_email_verified FROM users WHERE email = $1`;
    const result = await query(sql, [email]);
    return result.rows[0] as UserRecord | undefined;
  }

  async findDuplicates(email: string, phone?: string | null, instagramHandle?: string | null) {
    const sql = `
      SELECT id, email, phone, instagram_handle
      FROM users
      WHERE email = $1
         OR ($2::text IS NOT NULL AND phone = $2)
         OR ($3::text IS NOT NULL AND instagram_handle = $3)
    `;
    const result = await query(sql, [email, phone || null, instagramHandle || null]);
    return result.rows;
  }

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    role: string;
    companyName?: string | null;
    instagramHandle?: string | null;
    otp?: string | null;
    otpExpiry?: Date | null;
  }) {
    const sql = `
      INSERT INTO users (
        email, password, first_name, last_name, phone, role,
        company_name, instagram_handle, otp, otp_expiry
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, email, first_name, last_name, role, is_email_verified, created_at
    `;
    const params = [
      data.email,
      data.password,
      data.firstName,
      data.lastName,
      data.phone || null,
      data.role,
      data.companyName || null,
      data.instagramHandle || null,
      data.otp || null,
      data.otpExpiry || null,
    ];
    const result = await query(sql, params);
    return result.rows[0];
  }

  async setLastLogin(userId: string) {
    await query(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`, [userId]);
  }

  async getByEmailForOtp(email: string) {
    const result = await query(`SELECT id, email, otp, otp_expiry, is_email_verified FROM users WHERE email = $1`, [email]);
    return result.rows[0];
  }

  async verifyEmail(userId: string) {
    await query(`UPDATE users SET is_email_verified = TRUE, otp = NULL, otp_expiry = NULL WHERE id = $1`, [userId]);
  }

  async updateOtp(userId: string, otp: string, otpExpiry: Date) {
    await query(`UPDATE users SET otp = $1, otp_expiry = $2 WHERE id = $3`, [otp, otpExpiry, userId]);
  }

  async clearOtp(userId: string) {
    await query(`UPDATE users SET otp = NULL, otp_expiry = NULL WHERE id = $1`, [userId]);
  }

  async updatePassword(userId: string, hashedPassword: string) {
    await query(`UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [hashedPassword, userId]);
  }
}


