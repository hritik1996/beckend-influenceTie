import { Router } from 'express';
import { register, login, verifyOTP, resendOTP, requestPasswordReset, resetPassword } from '../controllers/auth';

const router = Router();

// Authentication routes
router.post('/register', register);
router.post('/login', login);
// OTP operations
router.post('/otp/verify', verifyOTP);
router.post('/otp/resend', resendOTP);

// Password reset via OTP
router.post('/password/reset/request', requestPasswordReset);
router.post('/password/reset/confirm', resetPassword);

export default router;


