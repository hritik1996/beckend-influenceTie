-- Allow null passwords for OAuth users
-- This enables Google OAuth login without requiring a password

ALTER TABLE users 
ALTER COLUMN password DROP NOT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN users.password IS 'Password hash for email/password login. NULL for OAuth-only users.';
