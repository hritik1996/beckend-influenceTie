import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  getUserProfile, 
  updateUserProfile, 
  changePassword, 
  deleteUserAccount, 
  getUserStats 
} from '../controllers/users';

const router = Router();

// Apply authentication middleware to all user routes
router.use(authenticateToken as any);

// User profile management
router.get('/me', getUserProfile as any);
router.put('/me', updateUserProfile as any);
router.delete('/me', deleteUserAccount as any);

// Password management
router.post('/change-password', changePassword as any);

// User statistics (for influencers)
router.get('/stats', getUserStats as any);

export default router;


