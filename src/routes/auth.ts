import { Router } from 'express';
import { register, login, verifyOTP, resendOTP } from '../controllers/auth';

const router = Router();

// Authentication routes
router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

export default router;


