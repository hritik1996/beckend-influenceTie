import { Router, Request, Response } from 'express';
import { InstagramService } from '../services/instagram';
import { InfluencerProfile } from '../models/instagram';
import { z } from 'zod';

const router = Router();

// Validation schemas
const connectInstagramSchema = z.object({
  access_token: z.string().min(1, 'Access token is required'),
  user_id: z.string().optional()
});

const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  limit: z.number().min(1).max(100).optional().default(25)
});

// In-memory storage for demonstration (replace with database)
let connectedInfluencers: Map<string, InfluencerProfile> = new Map();

/**
 * GET /api/influencers
 * Get all connected influencers
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const influencers = Array.from(connectedInfluencers.values());
    
    res.json({
      success: true,
      data: influencers,
      total: influencers.length,
      message: 'Connected influencers retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching influencers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch influencers'
    });
  }
});

/**
 * GET /api/influencers/:id
 * Get specific influencer profile with detailed analytics
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const influencer = connectedInfluencers.get(id);
    
    if (!influencer) {
      return res.status(404).json({
        success: false,
        message: 'Influencer not found'
      });
    }

    res.json({
      success: true,
      data: influencer
    });
  } catch (error) {
    console.error('Error fetching influencer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch influencer'
    });
  }
});

/**
 * POST /api/influencers/connect
 * Connect an Instagram account using access token
 */
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { access_token, user_id } = connectInstagramSchema.parse(req.body);
    
    const instagramService = new InstagramService(access_token);
    
    // Validate the token and get user analytics
    const validation = await instagramService.validateToken();
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Instagram access token',
        error: validation.error
      });
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

    // Store in memory (replace with database)
    connectedInfluencers.set(influencerProfile.id, influencerProfile);

    res.json({
      success: true,
      data: {
        profile: influencerProfile,
        insights: analytics.insights,
        recent_posts: analytics.recentPosts
      },
      message: 'Instagram account connected successfully'
    });
  } catch (error) {
    console.error('Error connecting Instagram account:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.issues
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to connect Instagram account'
    });
  }
});

/**
 * GET /api/influencers/:id/analytics
 * Get detailed analytics for a connected influencer
 */
router.get('/:id/analytics', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { access_token } = req.query;
    
    if (!access_token || typeof access_token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Instagram access token is required'
      });
    }

    const instagramService = new InstagramService(access_token);
    const analytics = await instagramService.getUserAnalytics(id === 'me' ? undefined : id);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
});

/**
 * GET /api/influencers/:id/media
 * Get Instagram media/posts for a connected influencer
 */
router.get('/:id/media', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { access_token, limit } = req.query;
    
    if (!access_token || typeof access_token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Instagram access token is required'
      });
    }

    const instagramService = new InstagramService(access_token);
    const media = await instagramService.getUserMedia(
      id === 'me' ? undefined : id, 
      limit ? Number(limit) : 25
    );
    
    res.json({
      success: true,
      data: media,
      total: media.length
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch media'
    });
  }
});

/**
 * POST /api/influencers/search/hashtag
 * Search for content by hashtag (limited functionality)
 */
router.post('/search/hashtag', async (req: Request, res: Response) => {
  try {
    const { query, access_token } = req.body;
    
    if (!access_token || !query) {
      return res.status(400).json({
        success: false,
        message: 'Access token and hashtag query are required'
      });
    }

    const instagramService = new InstagramService(access_token);
    const hashtagInfo = await instagramService.getHashtagInfo(query.replace('#', ''));
    
    res.json({
      success: true,
      data: hashtagInfo
    });
  } catch (error) {
    console.error('Error searching hashtag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search hashtag'
    });
  }
});

/**
 * PUT /api/influencers/:id/rates
 * Update influencer's rates manually
 */
router.put('/:id/rates', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rate_per_post, rate_per_story, categories, email, phone } = req.body;
    
    const influencer = connectedInfluencers.get(id);
    if (!influencer) {
      return res.status(404).json({
        success: false,
        message: 'Influencer not found'
      });
    }

    // Update the influencer profile
    if (rate_per_post !== undefined) influencer.rate_per_post = Number(rate_per_post);
    if (rate_per_story !== undefined) influencer.rate_per_story = Number(rate_per_story);
    if (categories) influencer.categories = categories;
    if (email) influencer.email = email;
    if (phone) influencer.phone = phone;
    influencer.last_updated = new Date();

    connectedInfluencers.set(id, influencer);

    res.json({
      success: true,
      data: influencer,
      message: 'Influencer rates updated successfully'
    });
  } catch (error) {
    console.error('Error updating influencer rates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update influencer rates'
    });
  }
});

export default router;


