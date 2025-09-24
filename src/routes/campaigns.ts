import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  applyToCampaign,
  getCampaignApplications,
  handleApplication
} from '../controllers/campaigns';

const router = Router();

// Apply authentication middleware to all campaign routes
router.use(authenticateToken as any);

// Campaign CRUD operations
router.post('/', createCampaign as any);                    // Create campaign (Brand)
router.get('/', getCampaigns as any);                       // Get campaigns with filters
router.get('/:id', getCampaignById as any);                 // Get specific campaign
router.put('/:id', updateCampaign as any);                  // Update campaign (Brand owner)
router.delete('/:id', deleteCampaign as any);               // Delete campaign (Brand owner)

// Campaign applications
router.post('/:id/apply', applyToCampaign as any);          // Apply to campaign (Influencer)
router.get('/:id/applications', getCampaignApplications as any); // Get applications (Brand owner)
router.put('/:campaignId/applications/:applicationId', handleApplication as any); // Accept/Reject (Brand owner)

export default router;


