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
router.use(authenticateToken);

// Campaign CRUD operations
router.post('/', createCampaign);                    // Create campaign (Brand)
router.get('/', getCampaigns);                       // Get campaigns with filters
router.get('/:id', getCampaignById);                 // Get specific campaign
router.put('/:id', updateCampaign);                  // Update campaign (Brand owner)
router.delete('/:id', deleteCampaign);               // Delete campaign (Brand owner)

// Campaign applications
router.post('/:id/apply', applyToCampaign);          // Apply to campaign (Influencer)
router.get('/:id/applications', getCampaignApplications); // Get applications (Brand owner)
router.put('/:campaignId/applications/:applicationId', handleApplication); // Accept/Reject (Brand owner)

export default router;


