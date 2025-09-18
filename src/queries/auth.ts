// Auth-related SQL queries

// Checks duplicates by email/phone/instagram_handle during registration
export const SELECT_USER_DUPLICATE_CHECK = `
  SELECT id, email, phone, instagram_handle
  FROM users
  WHERE email = $1
     OR ($2::text IS NOT NULL AND phone = $2)
     OR ($3::text IS NOT NULL AND instagram_handle = $3)
`;

// Inserts a new user with optional phone/company/instagram and OTP
export const INSERT_USER = `
  INSERT INTO users (
    email, password, first_name, last_name, phone, role,
    company_name, instagram_handle, otp, otp_expiry
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  RETURNING id, email, first_name, last_name, role, is_email_verified, created_at
`;

// Fetches user by email for login with password and verification flags
export const SELECT_USER_BY_EMAIL_FOR_LOGIN = `
  SELECT id, email, password, first_name, last_name, role,
         is_email_verified, is_phone_verified
  FROM users
  WHERE email = $1
`;

// Sets user's last_login_at timestamp
export const UPDATE_USER_LAST_LOGIN = `
  UPDATE users
  SET last_login_at = CURRENT_TIMESTAMP
  WHERE id = $1
`;

// Fetches user by email including OTP fields for verification
export const SELECT_USER_EMAIL_OTP = `
  SELECT id, email, otp, otp_expiry, is_email_verified
  FROM users
  WHERE email = $1
`;

// Marks email verified and clears OTP
export const UPDATE_USER_VERIFY_EMAIL = `
  UPDATE users
  SET is_email_verified = TRUE, otp = NULL, otp_expiry = NULL
  WHERE id = $1
`;

// Sets a new OTP and expiry
export const UPDATE_USER_SET_OTP = `
  UPDATE users
  SET otp = $1, otp_expiry = $2
  WHERE id = $3
`;

// Clears OTP fields without changing verification flags
export const UPDATE_USER_CLEAR_OTP = `
  UPDATE users
  SET otp = NULL, otp_expiry = NULL
  WHERE id = $1
`;

// Updates password
export const UPDATE_USER_PASSWORD = `
  UPDATE users
  SET password = $1, updated_at = CURRENT_TIMESTAMP
  WHERE id = $2
`;


