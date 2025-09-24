-- Add Google OAuth columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Create index for faster Google ID lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Update existing users to have default profile picture as NULL
-- (This is already the default, but making it explicit)
UPDATE users SET profile_picture = NULL WHERE profile_picture IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.google_id IS 'Google OAuth unique identifier';
COMMENT ON COLUMN users.profile_picture IS 'URL to user profile picture from Google or uploaded';
