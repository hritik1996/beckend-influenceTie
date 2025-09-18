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
import { hashPassword, verifyPassword } from '../utils/auth';

// Validation schemas
const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  bio: z.string().max(1000).optional(),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().max(255).optional(),
  dateOfBirth: z.string().optional(), // ISO date string
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  instagramHandle: z.string().regex(/^[a-zA-Z0-9_]{1,30}$/).optional().or(z.literal('')),
  companyName: z.string().max(255).optional(),
  industry: z.string().max(100).optional(),
  categories: z.array(z.string()).optional(),
  rates: z.record(z.string(), z.number().positive()).optional(), // {"post": 5000, "reel": 8000}
  preferences: z.record(z.string(), z.any()).optional()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
});

// Get current user profile
export async function getUserProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return errorResponse(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }

    const getUserQuery = `
      SELECT 
        id, email, first_name, last_name, avatar, role, phone,
        is_email_verified, is_phone_verified, bio, website, location,
        date_of_birth, gender, instagram_handle, instagram_id,
        followers_count, engagement_rate, categories, rates,
        company_name, industry, preferences, analytics,
        created_at, updated_at, last_login_at
      FROM users 
      WHERE id = $1
    `;
    
    const result = await query(getUserQuery, [req.user.id]);
    
    if (result.rows.length === 0) {
      return errorResponse(res, ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const user = result.rows[0];

    return successResponse(res, 'User profile retrieved successfully', { user });

  } catch (error) {
    console.error('Get user profile error:', error);
    return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

// Update user profile
export async function updateUserProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return errorResponse(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }

    // Validate input
    const validatedData = updateProfileSchema.parse(req.body);
    
    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    // Add each field that was provided
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
    
    // Add user ID for WHERE clause
    updateValues.push(req.user.id);

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id, email, first_name, last_name, avatar, role, phone,
        is_email_verified, is_phone_verified, bio, website, location,
        date_of_birth, gender, instagram_handle, instagram_id,
        followers_count, engagement_rate, categories, rates,
        company_name, industry, preferences, analytics,
        created_at, updated_at, last_login_at
    `;

    const result = await query(updateQuery, updateValues);
    
    if (result.rows.length === 0) {
      return errorResponse(res, ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const updatedUser = result.rows[0];

    return successResponse(res, 'Profile updated successfully', { user: updatedUser });

  } catch (error) {
    console.error('Update profile error:', error);
    
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

    // Handle unique constraint violations
    if ((error as any).code === '23505') {
      if ((error as any).constraint?.includes('instagram_handle')) {
        return errorResponse(res, 'Instagram handle is already taken', HTTP_STATUS.CONFLICT);
      }
      if ((error as any).constraint?.includes('phone')) {
        return errorResponse(res, 'Phone number is already in use', HTTP_STATUS.CONFLICT);
      }
    }

    return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

// Change password
export async function changePassword(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return errorResponse(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }

    // Validate input
    const validatedData = changePasswordSchema.parse(req.body);
    
    // Get current password from database
    const getCurrentPasswordQuery = `SELECT password FROM users WHERE id = $1`;
    const passwordResult = await query(getCurrentPasswordQuery, [req.user.id]);
    
    if (passwordResult.rows.length === 0) {
      return errorResponse(res, ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const currentHashedPassword = passwordResult.rows[0].password;

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(validatedData.currentPassword, currentHashedPassword);
    if (!isCurrentPasswordValid) {
      return errorResponse(res, 'Current password is incorrect', HTTP_STATUS.BAD_REQUEST);
    }

    // Hash new password
    const newHashedPassword = await hashPassword(validatedData.newPassword);

    // Update password in database
    const updatePasswordQuery = `
      UPDATE users 
      SET password = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `;
    
    await query(updatePasswordQuery, [newHashedPassword, req.user.id]);

    return successResponse(res, 'Password changed successfully');

  } catch (error) {
    console.error('Change password error:', error);
    
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

// Delete user account
export async function deleteUserAccount(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return errorResponse(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }

    // Note: Due to foreign key constraints, this will cascade delete related data
    const deleteUserQuery = `DELETE FROM users WHERE id = $1`;
    const result = await query(deleteUserQuery, [req.user.id]);
    
    if (result.rowCount === 0) {
      return errorResponse(res, ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return successResponse(res, 'Account deleted successfully');

  } catch (error) {
    console.error('Delete account error:', error);
    return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

// Get user statistics (for influencers)
export async function getUserStats(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return errorResponse(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }

    // Get campaign participation stats
    const campaignStatsQuery = `
      SELECT 
        COUNT(*) as total_campaigns,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_campaigns,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_campaigns,
        COALESCE(SUM(agreed_rate), 0) as total_earnings
      FROM campaign_participants 
      WHERE influencer_id = $1
    `;
    
    const campaignStatsResult = await query(campaignStatsQuery, [req.user.id]);
    const campaignStats = campaignStatsResult.rows[0];

    // Get content posts stats
    const contentStatsQuery = `
      SELECT 
        COUNT(*) as total_posts,
        COALESCE(SUM(likes_count), 0) as total_likes,
        COALESCE(SUM(views_count), 0) as total_views,
        COALESCE(AVG(engagement_rate), 0) as avg_engagement_rate
      FROM content_posts cp
      JOIN campaign_participants cpart ON cp.campaign_participant_id = cpart.id
      WHERE cpart.influencer_id = $1
    `;
    
    const contentStatsResult = await query(contentStatsQuery, [req.user.id]);
    const contentStats = contentStatsResult.rows[0];

    const stats = {
      campaigns: {
        total: parseInt(campaignStats.total_campaigns),
        completed: parseInt(campaignStats.completed_campaigns),
        active: parseInt(campaignStats.active_campaigns)
      },
      earnings: {
        total: parseFloat(campaignStats.total_earnings) || 0,
        currency: 'INR'
      },
      content: {
        totalPosts: parseInt(contentStats.total_posts),
        totalLikes: parseInt(contentStats.total_likes),
        totalViews: parseInt(contentStats.total_views),
        avgEngagementRate: parseFloat(contentStats.avg_engagement_rate) || 0
      }
    };

    return successResponse(res, 'User statistics retrieved successfully', { stats });

  } catch (error) {
    console.error('Get user stats error:', error);
    return errorResponse(res, ERROR_MESSAGES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
