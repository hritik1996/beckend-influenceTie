import { Router, Response } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply authentication and admin role requirement to all admin routes
router.use(authenticateToken as any);
router.use(requireRole(['ADMIN']) as any);

router.get('/dashboard', ((req: AuthRequest, res: Response) => {
  // TODO: Fetch real admin dashboard data from database
  res.json({
    success: true,
    data: {
      usersPendingKYC: 0,
      disputesOpen: 0,
      totalUsers: 0,
      totalCampaigns: 0,
      totalInfluencers: 0
    },
    message: 'Admin dashboard data retrieved successfully'
  });
}) as any);

export default router;


