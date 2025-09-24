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
    
    // Validate role parameter and store in session
    if (role && (role === 'BRAND' || role === 'INFLUENCER')) {
      // Store role in session for later use
      (req.session as any).signupRole = role;
      console.log('✅ Stored role in session:', (req.session as any).signupRole);
    } else {
      console.log('⚠️ No valid role parameter provided, will use default behavior');
    }
    
    // Continue with Google OAuth
    passport.authenticate('google', { 
      scope: ['profile', 'email'] 
    })(req, res, next);
  }
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    try {
      const user = req.user as any;
      const signupRole = (req.session as any)?.signupRole;
      
      console.log('🔍 Google user data:', user);
      console.log('🔍 Stored signup role:', signupRole);
      
      if (!user || !user.token) {
        return res.redirect(`${process.env.FRONTEND_URL || 'https://www.influencetie.com'}/login?error=auth_failed`);
      }

      // Clear the signup role from session
      if ((req.session as any)?.signupRole) {
        delete (req.session as any).signupRole;
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


