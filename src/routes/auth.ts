import { Router } from 'express';
import { register, login, verifyOTP, resendOTP, requestPasswordReset, resetPassword } from '../controllers/auth';
import passport from '../config/passport';

const router = Router();

// Authentication routes
router.post('/register', register);
router.post('/login', login);

// Google OAuth routes
router.get('/google', 
  (req, res, next) => {
    const { role } = req.query;
    
    // Debug log
    console.log('🔍 Received role parameter:', role);
    
    // Validate role parameter and use as state
    const validRole = (role && (role === 'BRAND' || role === 'INFLUENCER')) ? role : 'INFLUENCER';
    console.log('✅ Using role as state parameter:', validRole);
    
    // Continue with Google OAuth using state parameter
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      state: validRole // Pass role as state parameter
    })(req, res, next);
  }
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    try {
      const user = req.user as any;
      const stateRole = req.query?.state as string;
      
      console.log('🔍 Google user data:', user);
      console.log('🔍 State role from callback:', stateRole);
      
      if (!user || !user.token) {
        return res.redirect(`${process.env.FRONTEND_URL || 'https://www.influencetie.com'}/login?error=auth_failed`);
      }

      console.log('🚀 Redirecting to frontend with user data:', {
        id: user.id,
        email: user.email,
        role: user.role
      });

      // Successful authentication, redirect with token
      const frontendUrl = process.env.FRONTEND_URL || 'https://www.influencetie.com';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${user.token}&user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        profilePicture: user.profile_picture
      }))}`;
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'https://www.influencetie.com'}/login?error=callback_failed`);
    }
  }
);

// OTP operations
router.post('/otp/verify', verifyOTP);
router.post('/otp/resend', resendOTP);

// Password reset via OTP
router.post('/password/reset/request', requestPasswordReset);
router.post('/password/reset/confirm', resetPassword);

export default router;


