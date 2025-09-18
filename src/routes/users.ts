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
router.use(authenticateToken);

// User profile management
router.get('/me', getUserProfile);
router.put('/me', updateUserProfile);
router.delete('/me', deleteUserAccount);

// Password management
router.post('/change-password', changePassword);

// User statistics (for influencers)
router.get('/stats', getUserStats);

export default router;


