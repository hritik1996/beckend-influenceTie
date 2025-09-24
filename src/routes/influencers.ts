import { Router, Request, Response } from 'express';
import { InstagramService } from '../services/instagram';
import { InfluencerProfile } from '../models/instagram';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { query } from '../lib/database';
import { z } from 'zod';

const router = Router();

// Apply authentication middleware to all influencer routes
router.use(authenticateToken as any);

// Validation schemas
const connectInstagramSchema = z.object({
  access_token: z.string().min(1, 'Access token is required'),
  user_id: z.string().optional()
});

const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  limit: z.number().min(1).max(100).optional().default(25)
});

/**
 * GET /api/influencers
 * Get all influencers from database with optional filters
 */
router.get('/', (async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Parse query parameters for filtering
    const { 
      category, 
      minFollowers = 0, 
      maxFollowers, 
      minEngagement, 
      maxEngagement,
      location,
      page = 1, 
      limit = 25 
    } = req.query;

    // Build dynamic query
    let whereConditions = ['role = $1'];
    let queryParams: any[] = ['INFLUENCER'];
    let paramCount = 2;

    // Add filters
    if (category) {
      whereConditions.push(`$${paramCount++} = ANY(categories)`);
      queryParams.push(category);
    }

    if (minFollowers) {
      whereConditions.push(`followers_count >= $${paramCount++}`);
      queryParams.push(parseInt(minFollowers as string));
    }

    if (maxFollowers) {
      whereConditions.push(`followers_count <= $${paramCount++}`);
      queryParams.push(parseInt(maxFollowers as string));
    }

    if (minEngagement) {
      whereConditions.push(`engagement_rate >= $${paramCount++}`);
      queryParams.push(parseFloat(minEngagement as string));
    }

    if (maxEngagement) {
      whereConditions.push(`engagement_rate <= $${paramCount++}`);
      queryParams.push(parseFloat(maxEngagement as string));
    }

    if (location) {
      whereConditions.push(`location ILIKE $${paramCount++}`);
      queryParams.push(`%${location}%`);
    }

    const whereClause = whereConditions.join(' AND ');
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Main query
    const influencersQuery = `
      SELECT 
        id, first_name, last_name, instagram_handle, instagram_id,
        followers_count, engagement_rate, categories, bio, location,
        avatar, rates, analytics, created_at
      FROM users 
      WHERE ${whereClause}
        AND instagram_handle IS NOT NULL 
        AND is_email_verified = true
      ORDER BY followers_count DESC
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    queryParams.push(parseInt(limit as string), offset);

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM users 
      WHERE ${whereClause}
        AND instagram_handle IS NOT NULL 
        AND is_email_verified = true
    `;

    const [influencersResult, countResult] = await Promise.all([
      query(influencersQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
    ]);

    const influencers = influencersResult.rows;
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        influencers,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      },
      message: 'Influencers retrieved successfully'
    });
    return;
  } catch (error) {
    console.error('Error fetching influencers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch influencers'
    });
    return;
  }
}) as any);

/**
 * GET /api/influencers/:id
 * Get specific influencer profile with detailed analytics
 */
router.get('/:id', (async (req: AuthRequest & { params: { id: string } }, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Get influencer from database with campaign history
    const influencerQuery = `
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.instagram_handle, 
        u.instagram_id, u.followers_count, u.engagement_rate, u.categories,
        u.bio, u.location, u.website, u.avatar, u.rates, u.analytics,
        u.instagram_data, u.created_at,
        COUNT(cp.id) as total_campaigns,
        COUNT(cp.id) FILTER (WHERE cp.status = 'COMPLETED') as completed_campaigns,
        COALESCE(AVG(content.engagement_rate), 0) as avg_content_engagement
      FROM users u
      LEFT JOIN campaign_participants cp ON u.id = cp.influencer_id
      LEFT JOIN content_posts content ON cp.id = content.campaign_participant_id
      WHERE u.id = $1 AND u.role = 'INFLUENCER'
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.instagram_handle,
               u.instagram_id, u.followers_count, u.engagement_rate, u.categories,
               u.bio, u.location, u.website, u.avatar, u.rates, u.analytics,
               u.instagram_data, u.created_at
    `;
    
    const result = await query(influencerQuery, [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Influencer not found'
      });
      return;
    }

    const influencer = result.rows[0];

    // Get recent campaign performance
    const recentCampaignsQuery = `
      SELECT 
        c.title, c.category, cp.status, cp.agreed_rate,
        cp.completed_at, COUNT(content.id) as content_count
      FROM campaign_participants cp
      JOIN campaigns c ON cp.campaign_id = c.id
      LEFT JOIN content_posts content ON cp.id = content.campaign_participant_id
      WHERE cp.influencer_id = $1
      GROUP BY c.id, c.title, c.category, cp.status, cp.agreed_rate, cp.completed_at
      ORDER BY cp.applied_at DESC
      LIMIT 5
    `;

    const campaignsResult = await query(recentCampaignsQuery, [id]);
    
    const responseData = {
      ...influencer,
      total_campaigns: parseInt(influencer.total_campaigns),
      completed_campaigns: parseInt(influencer.completed_campaigns),
      avg_content_engagement: parseFloat(influencer.avg_content_engagement),
      recent_campaigns: campaignsResult.rows
    };

    res.json({
      success: true,
      data: responseData,
      message: 'Influencer profile retrieved successfully'
    });
    return;
  } catch (error) {
    console.error('Error fetching influencer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch influencer'
    });
    return;
  }
}) as any);

/**
 * POST /api/influencers/connect
 * Connect an Instagram account using access token
 */
router.post('/connect', (async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { access_token, user_id } = connectInstagramSchema.parse(req.body);
    
    const instagramService = new InstagramService(access_token);
    
    // Validate the token and get user analytics
    const validation = await instagramService.validateToken();
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: 'Invalid Instagram access token',
        error: validation.error
      });
      return;
    }

    // Get comprehensive user analytics
    const analytics = await instagramService.getUserAnalytics(user_id);
    
    // Create influencer profile
    const influencerProfile: InfluencerProfile = {
      id: analytics.profile.id,
      instagram_user_id: analytics.profile.id,
      username: analytics.profile.username,
      display_name: analytics.profile.name || analytics.profile.username,
      profile_picture: analytics.profile.profile_picture_url || '',
      followers_count: analytics.profile.followers_count || 0,
      engagement_rate: analytics.avgEngagement,
      categories: [], // Can be filled manually or through analysis
      location: '', // Can be extracted from bio or manually added
      email: '', // Manually provided
      phone: '', // Manually provided
      rate_per_post: 0, // Manually set
      rate_per_story: 0, // Manually set
      verified: analytics.profile.account_type === 'BUSINESS' || analytics.profile.account_type === 'CREATOR',
      last_updated: new Date(),
      status: 'active',
      avg_likes: analytics.recentPosts.reduce((sum, post) => sum + (post.like_count || 0), 0) / Math.max(analytics.recentPosts.length, 1),
      avg_comments: analytics.recentPosts.reduce((sum, post) => sum + (post.comments_count || 0), 0) / Math.max(analytics.recentPosts.length, 1),
      total_posts: analytics.profile.media_count || 0,
      recent_posts: analytics.recentPosts.slice(0, 10) // Store latest 10 posts
    };

    // Store Instagram data in database (update current user's profile)
    const updateUserQuery = `
      UPDATE users SET
        instagram_handle = $1,
        instagram_id = $2,
        followers_count = $3,
        engagement_rate = $4,
        instagram_data = $5,
        analytics = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND role = 'INFLUENCER'
      RETURNING id, first_name, last_name, instagram_handle, followers_count, engagement_rate
    `;

    const instagramData = {
      profile: analytics.profile,
      recent_posts: analytics.recentPosts.slice(0, 10),
      connected_at: new Date().toISOString(),
      access_token_valid: true
    };

    const analyticsData = {
      insights: analytics.insights,
      avg_likes: analytics.recentPosts.reduce((sum, post) => sum + (post.like_count || 0), 0) / Math.max(analytics.recentPosts.length, 1),
      avg_comments: analytics.recentPosts.reduce((sum, post) => sum + (post.comments_count || 0), 0) / Math.max(analytics.recentPosts.length, 1),
      total_posts: analytics.profile.media_count || 0,
      last_updated: new Date().toISOString()
    };

    const updateResult = await query(updateUserQuery, [
      analytics.profile.username,
      analytics.profile.id,
      analytics.profile.followers_count || 0,
      analytics.avgEngagement || 0,
      JSON.stringify(instagramData),
      JSON.stringify(analyticsData),
      req.user!.id
    ]);

    if (updateResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'User not found or not an influencer'
      });
      return;
    }

    const updatedUser = updateResult.rows[0];

    res.json({
      success: true,
      data: {
        user: updatedUser,
        profile: influencerProfile,
        insights: analytics.insights,
        recent_posts: analytics.recentPosts
      },
      message: 'Instagram account connected successfully'
    });
    return;
  } catch (error) {
    console.error('Error connecting Instagram account:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.issues
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to connect Instagram account'
    });
    return;
  }
}) as any);

/**
 * GET /api/influencers/:id/analytics
 * Get detailed analytics for a connected influencer
 */
router.get('/:id/analytics', (async (req: AuthRequest & { params: { id: string } }, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { access_token } = req.query;
    
    if (!access_token || typeof access_token !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Instagram access token is required'
      });
      return;
    }

    const instagramService = new InstagramService(access_token);
    const analytics = await instagramService.getUserAnalytics(id === 'me' ? undefined : (id as string));
    
    res.json({
      success: true,
      data: analytics
    });
    return;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
    return;
  }
}) as any);

/**
 * GET /api/influencers/:id/media
 * Get Instagram media/posts for a connected influencer
 */
router.get('/:id/media', (async (req: AuthRequest & { params: { id: string } }, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { access_token, limit } = req.query;
    
    if (!access_token || typeof access_token !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Instagram access token is required'
      });
      return;
    }

    const instagramService = new InstagramService(access_token);
    const media = await instagramService.getUserMedia(
      id === 'me' ? undefined : (id as string), 
      limit ? Number(limit) : 25
    );
    
    res.json({
      success: true,
      data: media,
      total: media.length
    });
    return;
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch media'
    });
    return;
  }
}) as any);

/**
 * POST /api/influencers/search/hashtag
 * Search for content by hashtag (limited functionality)
 */
router.post('/search/hashtag', (async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { query, access_token } = req.body;
    
    if (!access_token || !query) {
      res.status(400).json({
        success: false,
        message: 'Access token and hashtag query are required'
      });
      return;
    }

    const instagramService = new InstagramService(access_token);
    const hashtagInfo = await instagramService.getHashtagInfo(query.replace('#', ''));
    
    res.json({
      success: true,
      data: hashtagInfo
    });
    return;
  } catch (error) {
    console.error('Error searching hashtag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search hashtag'
    });
    return;
  }
}) as any);

/**
 * PUT /api/influencers/:id/rates
 * Update influencer's rates manually
 */
router.put('/:id/rates', (async (req: AuthRequest & { params: { id: string } }, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { rate_per_post, rate_per_story, categories, email, phone } = req.body;
    
    // Check if user is updating their own profile or has admin access
    if (req.user!.id !== id && req.user!.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'You can only update your own profile'
      });
      return;
    }

    // Check if user exists and is an influencer
    const userCheck = await query('SELECT id, rates FROM users WHERE id = $1 AND role = $2', [id, 'INFLUENCER']);
    if (userCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Influencer not found'
      });
      return;
    }

    // Build current rates object
    const currentRates = userCheck.rows[0].rates || {};
    const updatedRates = { ...currentRates };

    // Update rates
    if (rate_per_post !== undefined) updatedRates.post = Number(rate_per_post);
    if (rate_per_story !== undefined) updatedRates.story = Number(rate_per_story);

    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    if (rate_per_post !== undefined || rate_per_story !== undefined) {
      updateFields.push(`rates = $${paramCount++}`);
      updateValues.push(JSON.stringify(updatedRates));
    }

    if (categories) {
      updateFields.push(`categories = $${paramCount++}`);
      updateValues.push(categories);
    }

    if (email) {
      updateFields.push(`email = $${paramCount++}`);
      updateValues.push(email);
    }

    if (phone) {
      updateFields.push(`phone = $${paramCount++}`);
      updateValues.push(phone);
    }

    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
      return;
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add user ID for WHERE clause
    updateValues.push(id);

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id, first_name, last_name, instagram_handle, followers_count, 
        engagement_rate, categories, rates, email, phone, updated_at
    `;

    const result = await query(updateQuery, updateValues);
    const updatedInfluencer = result.rows[0];

    res.json({
      success: true,
      data: updatedInfluencer,
      message: 'Influencer profile updated successfully'
    });
    return;
  } catch (error) {
    console.error('Error updating influencer rates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update influencer profile'
    });
    return;
  }
}) as any);

export default router;


