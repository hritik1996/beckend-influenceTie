import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { query } from '../lib/database';
import { generateJWT, createJWTPayload } from '../utils/auth';
import { ROLES } from '../constants';

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('Google OAuth Profile:', {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName
        });

        const email = profile.emails?.[0]?.value;
        const googleId = profile.id;
        const firstName = profile.name?.givenName || '';
        const lastName = profile.name?.familyName || '';
        const profilePicture = profile.photos?.[0]?.value || '';

        if (!email) {
          return done(new Error('No email found in Google profile'), false);
        }

        // Check if user already exists with this email
        const existingUserResult = await query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );

        let user;

        if (existingUserResult.rows.length > 0) {
          // User exists, update Google ID and profile picture if needed
          user = existingUserResult.rows[0];
          
          await query(
            `UPDATE users 
             SET google_id = $1, profile_picture = $2, last_login_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [googleId, profilePicture, user.id]
          );

          user.google_id = googleId;
          user.profile_picture = profilePicture;
        } else {
          // Create new user
          const insertResult = await query(
            `INSERT INTO users (
              email, first_name, last_name, google_id, profile_picture,
              is_email_verified, role, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *`,
            [email, firstName, lastName, googleId, profilePicture, true, ROLES.INFLUENCER]
          );

          user = insertResult.rows[0];
        }

        // Generate JWT token
        const jwtPayload = createJWTPayload({
          id: user.id,
          email: user.email,
          role: user.role
        });
        const token = generateJWT(jwtPayload);

        // Attach token to user object for later use
        user.token = token;

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth Error:', error);
        return done(error, false);
      }
    }
  )
);

// Serialize user for session (optional, if using sessions)
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session (optional, if using sessions)
passport.deserializeUser(async (id: string, done) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    const user = result.rows[0];
    done(null, user);
  } catch (error) {
    done(error, false);
  }
});

export default passport;
