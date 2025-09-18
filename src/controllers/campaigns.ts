import { Response } from 'express';
import { query } from '../lib/database';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse,
  HTTP_STATUS,
  ERROR_MESSAGES 
} from '../utils/response';

// Validation schemas
const createCampaignSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  budget: z.number().positive('Budget must be positive'),
  category: z.string().min(1, 'Category is required').max(100),
  requirements: z.string().optional(),
  startDate: z.string(), // ISO date string
  endDate: z.string(), // ISO date string
  requirementsJson: z.record(z.any()).optional(),
  targetAudience: z.record(z.any()).optional(),
  contentGuidelines: z.record(z.any()).optional()
});

const updateCampaignSchema = createCampaignSchema.partial().omit({ budget: true });

const campaignFiltersSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  category: z.string().optional(),
  minBudget: z.number().positive().optional(),
  maxBudget: z.number().positive().optional(),
  page: z.number().positive().default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional()
});

const applicationActionSchema = z.object({
  action: z.enum(['ACCEPT', 'REJECT']),
  proposedRate: z.number().positive().optional()
});

// Create a new campaign (Brand only)
export async function createCampaign(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return errorResponse(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }

    // Only brands can create campaigns
    if (req.user.role !== 'BRAND') {
      return errorResponse(res, 'Only brands can create campaigns', HTTP_STATUS.FORBIDDEN);
    }

    // Validate input
    const validatedData = createCampaignSchema.parse(req.body);
    
    // Validate date order
    if (new Date(validatedData.endDate) <= new Date(validatedData.startDate)) {
      return errorResponse(res, 'End date must be after start date', HTTP_STATUS.BAD_REQUEST);
    }

    const createCampaignQuery = `
      INSERT INTO campaigns (
        title, description, budget, category, requirements,
        start_date, end_date, requirements_json, target_audience,
        content_guidelines, brand_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'DRAFT')
      RETURNING *
    `;

    const result = await query(createCampaignQuery, [
      validatedData.title,
      validatedData.description,
      validatedData.budget,
      validatedData.category,
      validatedData.requirements || null,
      validatedData.startDate,
      validatedData.endDate,
      validatedData.requirementsJson || null,
      validatedData.targetAudience || null,
      validatedData.contentGuidelines || null,
      req.user.id
    ]);

    const newCampaign = result.rows[0];

    return successResponse(
      res, 
      'Campaign created successfully', 
      { campaign: newCampaign }, 
      HTTP_STATUS.CREATED
    );

  } catch (error) {
    console.error('Create campaign error:', error);
    
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.issues.forEach(issue => {
        const field = issue.path.join('.');
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(issue.message);
      });
      return validationErrorResponse(res, ERROR_MESSAGES.VALIDATION_ERROR, errors);
    }

    return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

// Get campaigns with filtering and pagination
export async function getCampaigns(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return errorResponse(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }

    // Validate query parameters
    const filters = campaignFiltersSchema.parse(req.query);
    
    // Build dynamic query
    let whereConditions = [];
    let queryParams: any[] = [];
    let paramCount = 1;

    // For brands, show only their campaigns
    // For influencers, show only ACTIVE campaigns
    if (req.user.role === 'BRAND') {
      whereConditions.push(`c.brand_id = $${paramCount++}`);
      queryParams.push(req.user.id);
    } else {
      whereConditions.push(`c.status = 'ACTIVE'`);
    }

    // Apply filters
    if (filters.status) {
      whereConditions.push(`c.status = $${paramCount++}`);
      queryParams.push(filters.status);
    }

    if (filters.category) {
      whereConditions.push(`c.category ILIKE $${paramCount++}`);
      queryParams.push(`%${filters.category}%`);
    }

    if (filters.minBudget) {
      whereConditions.push(`c.budget >= $${paramCount++}`);
      queryParams.push(filters.minBudget);
    }

    if (filters.maxBudget) {
      whereConditions.push(`c.budget <= $${paramCount++}`);
      queryParams.push(filters.maxBudget);
    }

    if (filters.search) {
      whereConditions.push(`(c.title ILIKE $${paramCount++} OR c.description ILIKE $${paramCount++})`);
      queryParams.push(`%${filters.search}%`, `%${filters.search}%`);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Calculate offset for pagination
    const offset = (filters.page - 1) * filters.limit;

    // Main query
    const campaignsQuery = `
      SELECT 
        c.*,
        u.first_name || ' ' || u.last_name as brand_name,
        u.company_name,
        COUNT(cp.id) as applications_count
      FROM campaigns c
      LEFT JOIN users u ON c.brand_id = u.id
      LEFT JOIN campaign_participants cp ON c.id = cp.campaign_id
      ${whereClause}
      GROUP BY c.id, u.first_name, u.last_name, u.company_name
      ORDER BY c.created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    queryParams.push(filters.limit, offset);

    // Count query for total
    const countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM campaigns c
      LEFT JOIN users u ON c.brand_id = u.id
      ${whereClause}
    `;

    const [campaignsResult, countResult] = await Promise.all([
      query(campaignsQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
    ]);

    const campaigns = campaignsResult.rows;
    const total = parseInt(countResult.rows[0].total);

    const pagination = {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.ceil(total / filters.limit)
    };

    return successResponse(res, 'Campaigns retrieved successfully', {
      campaigns,
      pagination
    });

  } catch (error) {
    console.error('Get campaigns error:', error);
    
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.issues.forEach(issue => {
        const field = issue.path.join('.');
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(issue.message);
      });
      return validationErrorResponse(res, ERROR_MESSAGES.VALIDATION_ERROR, errors);
    }

    return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

// Get specific campaign by ID
export async function getCampaignById(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return errorResponse(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }

    const campaignId = req.params.id;

    // Get campaign with brand details and application status for current user
    const campaignQuery = `
      SELECT 
        c.*,
        u.first_name || ' ' || u.last_name as brand_name,
        u.company_name,
        u.email as brand_email,
        COUNT(cp.id) as applications_count,
        COUNT(cp.id) FILTER (WHERE cp.status = 'ACCEPTED') as accepted_count,
        CASE 
          WHEN $2 = c.brand_id THEN true 
          ELSE false 
        END as is_owner,
        cp_user.status as user_application_status,
        cp_user.proposed_rate as user_proposed_rate,
        cp_user.applied_at as user_applied_at
      FROM campaigns c
      LEFT JOIN users u ON c.brand_id = u.id
      LEFT JOIN campaign_participants cp ON c.id = cp.campaign_id
      LEFT JOIN campaign_participants cp_user ON c.id = cp_user.campaign_id AND cp_user.influencer_id = $2
      WHERE c.id = $1
      GROUP BY c.id, u.first_name, u.last_name, u.company_name, u.email, 
               cp_user.status, cp_user.proposed_rate, cp_user.applied_at
    `;

    const result = await query(campaignQuery, [campaignId, req.user.id]);
    
    if (result.rows.length === 0) {
      return errorResponse(res, 'Campaign not found', HTTP_STATUS.NOT_FOUND);
    }

    const campaign = result.rows[0];

    // For influencers, hide campaigns that are not ACTIVE (unless they applied)
    if (req.user.role !== 'BRAND' && campaign.status !== 'ACTIVE' && !campaign.user_application_status) {
      return errorResponse(res, 'Campaign not found', HTTP_STATUS.NOT_FOUND);
    }

    return successResponse(res, 'Campaign retrieved successfully', { campaign });

  } catch (error) {
    console.error('Get campaign by ID error:', error);
    return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

// Update campaign (Brand owner only)
export async function updateCampaign(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return errorResponse(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }

    const campaignId = req.params.id;
    
    // Validate input
    const validatedData = updateCampaignSchema.parse(req.body);

    // Check if user owns this campaign
    const ownershipCheck = await query('SELECT brand_id FROM campaigns WHERE id = $1', [campaignId]);
    
    if (ownershipCheck.rows.length === 0) {
      return errorResponse(res, 'Campaign not found', HTTP_STATUS.NOT_FOUND);
    }

    if (ownershipCheck.rows[0].brand_id !== req.user.id) {
      return errorResponse(res, 'You can only update your own campaigns', HTTP_STATUS.FORBIDDEN);
    }

    // Validate date order if both dates are provided
    if (validatedData.startDate && validatedData.endDate) {
      if (new Date(validatedData.endDate) <= new Date(validatedData.startDate)) {
        return errorResponse(res, 'End date must be after start date', HTTP_STATUS.BAD_REQUEST);
      }
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert camelCase to snake_case for database columns
        const dbColumn = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        updateFields.push(`${dbColumn} = $${paramCount++}`);
        updateValues.push(value);
      }
    });

    if (updateFields.length === 0) {
      return errorResponse(res, 'No fields to update', HTTP_STATUS.BAD_REQUEST);
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add campaign ID for WHERE clause
    updateValues.push(campaignId);

    const updateQuery = `
      UPDATE campaigns 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);
    const updatedCampaign = result.rows[0];

    return successResponse(res, 'Campaign updated successfully', { campaign: updatedCampaign });

  } catch (error) {
    console.error('Update campaign error:', error);
    
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.issues.forEach(issue => {
        const field = issue.path.join('.');
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(issue.message);
      });
      return validationErrorResponse(res, ERROR_MESSAGES.VALIDATION_ERROR, errors);
    }

    return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

// Delete campaign (Brand owner only)
export async function deleteCampaign(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return errorResponse(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }

    const campaignId = req.params.id;

    // Check if user owns this campaign
    const ownershipCheck = await query('SELECT brand_id, status FROM campaigns WHERE id = $1', [campaignId]);
    
    if (ownershipCheck.rows.length === 0) {
      return errorResponse(res, 'Campaign not found', HTTP_STATUS.NOT_FOUND);
    }

    const campaign = ownershipCheck.rows[0];
    if (campaign.brand_id !== req.user.id) {
      return errorResponse(res, 'You can only delete your own campaigns', HTTP_STATUS.FORBIDDEN);
    }

    // Don't allow deletion of active campaigns with accepted participants
    if (campaign.status === 'ACTIVE') {
      const participantsCheck = await query(
        'SELECT COUNT(*) as count FROM campaign_participants WHERE campaign_id = $1 AND status = $2',
        [campaignId, 'ACCEPTED']
      );
      
      if (parseInt(participantsCheck.rows[0].count) > 0) {
        return errorResponse(res, 'Cannot delete active campaign with accepted participants', HTTP_STATUS.BAD_REQUEST);
      }
    }

    // Delete campaign (will cascade delete participants)
    await query('DELETE FROM campaigns WHERE id = $1', [campaignId]);

    return successResponse(res, 'Campaign deleted successfully');

  } catch (error) {
    console.error('Delete campaign error:', error);
    return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

// Apply to campaign (Influencer only)
export async function applyToCampaign(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return errorResponse(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }

    // Only influencers can apply to campaigns
    if (req.user.role !== 'INFLUENCER') {
      return errorResponse(res, 'Only influencers can apply to campaigns', HTTP_STATUS.FORBIDDEN);
    }

    const campaignId = req.params.id;
    const { proposedRate } = req.body;

    // Check if campaign exists and is ACTIVE
    const campaignCheck = await query('SELECT status, end_date FROM campaigns WHERE id = $1', [campaignId]);
    
    if (campaignCheck.rows.length === 0) {
      return errorResponse(res, 'Campaign not found', HTTP_STATUS.NOT_FOUND);
    }

    const campaign = campaignCheck.rows[0];
    if (campaign.status !== 'ACTIVE') {
      return errorResponse(res, 'Campaign is not accepting applications', HTTP_STATUS.BAD_REQUEST);
    }

    // Check if campaign hasn't expired
    if (new Date(campaign.end_date) < new Date()) {
      return errorResponse(res, 'Campaign has expired', HTTP_STATUS.BAD_REQUEST);
    }

    // Check if user already applied
    const existingApplication = await query(
      'SELECT id FROM campaign_participants WHERE campaign_id = $1 AND influencer_id = $2',
      [campaignId, req.user.id]
    );

    if (existingApplication.rows.length > 0) {
      return errorResponse(res, 'You have already applied to this campaign', HTTP_STATUS.CONFLICT);
    }

    // Create application
    const applicationQuery = `
      INSERT INTO campaign_participants (campaign_id, influencer_id, proposed_rate, status)
      VALUES ($1, $2, $3, 'INVITED')
      RETURNING *
    `;

    const result = await query(applicationQuery, [campaignId, req.user.id, proposedRate || null]);
    const application = result.rows[0];

    return successResponse(
      res, 
      'Application submitted successfully', 
      { application }, 
      HTTP_STATUS.CREATED
    );

  } catch (error) {
    console.error('Apply to campaign error:', error);
    return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

// Get campaign applications (Brand owner only)
export async function getCampaignApplications(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return errorResponse(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }

    const campaignId = req.params.id;

    // Check if user owns this campaign
    const ownershipCheck = await query('SELECT brand_id FROM campaigns WHERE id = $1', [campaignId]);
    
    if (ownershipCheck.rows.length === 0) {
      return errorResponse(res, 'Campaign not found', HTTP_STATUS.NOT_FOUND);
    }

    if (ownershipCheck.rows[0].brand_id !== req.user.id) {
      return errorResponse(res, 'You can only view applications for your own campaigns', HTTP_STATUS.FORBIDDEN);
    }

    // Get applications with influencer details
    const applicationsQuery = `
      SELECT 
        cp.*,
        u.first_name,
        u.last_name,
        u.email,
        u.instagram_handle,
        u.followers_count,
        u.engagement_rate,
        u.categories,
        u.bio,
        u.rates
      FROM campaign_participants cp
      JOIN users u ON cp.influencer_id = u.id
      WHERE cp.campaign_id = $1
      ORDER BY cp.applied_at DESC
    `;

    const result = await query(applicationsQuery, [campaignId]);
    const applications = result.rows;

    return successResponse(res, 'Campaign applications retrieved successfully', { applications });

  } catch (error) {
    console.error('Get campaign applications error:', error);
    return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

// Accept/Reject application (Brand owner only)
export async function handleApplication(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return errorResponse(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }

    const { campaignId, applicationId } = req.params;
    
    // Validate input
    const validatedData = applicationActionSchema.parse(req.body);

    // Check if user owns this campaign
    const ownershipCheck = await query('SELECT brand_id FROM campaigns WHERE id = $1', [campaignId]);
    
    if (ownershipCheck.rows.length === 0) {
      return errorResponse(res, 'Campaign not found', HTTP_STATUS.NOT_FOUND);
    }

    if (ownershipCheck.rows[0].brand_id !== req.user.id) {
      return errorResponse(res, 'You can only manage applications for your own campaigns', HTTP_STATUS.FORBIDDEN);
    }

    // Check if application exists
    const applicationCheck = await query(
      'SELECT * FROM campaign_participants WHERE id = $1 AND campaign_id = $2',
      [applicationId, campaignId]
    );

    if (applicationCheck.rows.length === 0) {
      return errorResponse(res, 'Application not found', HTTP_STATUS.NOT_FOUND);
    }

    // Update application
    let updateQuery: string;
    let updateValues: any[];

    if (validatedData.action === 'ACCEPT') {
      updateQuery = `
        UPDATE campaign_participants 
        SET status = 'ACCEPTED', accepted_at = CURRENT_TIMESTAMP, agreed_rate = $1
        WHERE id = $2 AND campaign_id = $3
        RETURNING *
      `;
      updateValues = [validatedData.proposedRate || applicationCheck.rows[0].proposed_rate, applicationId, campaignId];
    } else {
      updateQuery = `
        UPDATE campaign_participants 
        SET status = 'REJECTED'
        WHERE id = $1 AND campaign_id = $2
        RETURNING *
      `;
      updateValues = [applicationId, campaignId];
    }

    const result = await query(updateQuery, updateValues);
    const updatedApplication = result.rows[0];

    const actionMessage = validatedData.action === 'ACCEPT' ? 'accepted' : 'rejected';
    return successResponse(res, `Application ${actionMessage} successfully`, { application: updatedApplication });

  } catch (error) {
    console.error('Handle application error:', error);
    
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.issues.forEach(issue => {
        const field = issue.path.join('.');
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(issue.message);
      });
      return validationErrorResponse(res, ERROR_MESSAGES.VALIDATION_ERROR, errors);
    }

    return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
