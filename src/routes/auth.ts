import { Router } from 'express';
import { register, login, verifyOTP, resendOTP, requestPasswordReset, resetPassword } from '../controllers/auth';
import passport from '../config/passport';

const router = Router();

// Authentication routes
router.post('/register', register);
router.post('/login', login);

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.token) {
        return res.redirect(`${process.env.FRONTEND_URL || 'https://www.influencetie.com'}/login?error=auth_failed`);
      }

      // Successful authentication, redirect with token
      const redirectUrl = `${process.env.FRONTEND_URL || 'https://www.influencetie.com'}/auth/callback?token=${user.token}&user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        profilePicture: user.profile_picture
      }))}`;
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google callback error:', error);
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


