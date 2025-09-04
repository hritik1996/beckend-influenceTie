import axios, { AxiosResponse } from 'axios';
import { 
  InstagramUser, 
  InstagramMedia, 
  InstagramInsights, 
  InstagramApiResponse,
  InstagramMediaInsights 
} from '../models/instagram';

export class InstagramService {
  private baseUrl = 'https://graph.instagram.com';
  private graphUrl = 'https://graph.facebook.com/v23.0';

  constructor(private accessToken: string) {}

  /**
   * Get Instagram user profile information
   */
  async getUserProfile(userId?: string): Promise<InstagramUser> {
    try {
      const id = userId || 'me';
      const fields = [
        'id',
        'username',
        'name',
        'profile_picture_url',
        'followers_count',
        'follows_count',
        'media_count',
        'biography',
        'website',
        'account_type'
      ].join(',');

      const response = await axios.get(`${this.baseUrl}/${id}`, {
        params: {
          fields,
          access_token: this.accessToken
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching Instagram user profile:', error);
      throw new Error('Failed to fetch Instagram user profile');
    }
  }

  /**
   * Get user's Instagram media/posts
   */
  async getUserMedia(userId?: string, limit = 25): Promise<InstagramMedia[]> {
    try {
      const id = userId || 'me';
      const fields = [
        'id',
        'media_type',
        'media_url',
        'permalink',
        'caption',
        'timestamp',
        'like_count',
        'comments_count',
        'thumbnail_url',
        'children{id,media_type,media_url,thumbnail_url}'
      ].join(',');

      const response = await axios.get(`${this.baseUrl}/${id}/media`, {
        params: {
          fields,
          limit,
          access_token: this.accessToken
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching Instagram media:', error);
      throw new Error('Failed to fetch Instagram media');
    }
  }

  /**
   * Get media insights/analytics
   */
  async getMediaInsights(mediaId: string): Promise<InstagramMediaInsights> {
    try {
      // Different metrics for different media types
      const metrics = [
        'impressions',
        'reach',
        'engagement',
        'saves',
        'video_views', // only for videos
        'likes', // for posts
        'comments',
        'shares'
      ].join(',');

      const response = await axios.get(`${this.baseUrl}/${mediaId}/insights`, {
        params: {
          metric: metrics,
          access_token: this.accessToken
        }
      });

      // Transform the response to a more usable format
      const insights: InstagramMediaInsights = {};
      response.data.data.forEach((metric: any) => {
        insights[metric.name as keyof InstagramMediaInsights] = metric.values[0]?.value || 0;
      });

      return insights;
    } catch (error) {
      console.error('Error fetching media insights:', error);
      throw new Error('Failed to fetch media insights');
    }
  }

  /**
   * Get user insights/analytics
   */
  async getUserInsights(userId?: string, period = 'day'): Promise<InstagramInsights> {
    try {
      const id = userId || 'me';
      const metrics = [
        'followers_count',
        'profile_views',
        'reach',
        'impressions'
      ].join(',');

      const response = await axios.get(`${this.baseUrl}/${id}/insights`, {
        params: {
          metric: metrics,
          period,
          access_token: this.accessToken
        }
      });

      // Transform the response to a more usable format
      const insights: InstagramInsights = { period };
      response.data.data.forEach((metric: any) => {
        const value = metric.values?.[0]?.value || 0;
        insights[metric.name as keyof InstagramInsights] = value;
      });

      return insights;
    } catch (error) {
      console.error('Error fetching user insights:', error);
      throw new Error('Failed to fetch user insights');
    }
  }

  /**
   * Get user's recent posts with analytics
   */
  async getUserAnalytics(userId?: string): Promise<{
    profile: InstagramUser;
    recentPosts: InstagramMedia[];
    insights: InstagramInsights;
    avgEngagement: number;
  }> {
    try {
      const [profile, recentPosts, insights] = await Promise.all([
        this.getUserProfile(userId),
        this.getUserMedia(userId, 20),
        this.getUserInsights(userId)
      ]);

      // Calculate average engagement
      let totalLikes = 0;
      let totalComments = 0;
      let postsWithEngagement = 0;

      for (const post of recentPosts) {
        if (post.like_count !== undefined && post.comments_count !== undefined) {
          totalLikes += post.like_count;
          totalComments += post.comments_count;
          postsWithEngagement++;
        }
      }

      const avgEngagement = postsWithEngagement > 0 
        ? ((totalLikes + totalComments) / postsWithEngagement) / (profile.followers_count || 1) * 100
        : 0;

      return {
        profile,
        recentPosts,
        insights,
        avgEngagement: Number(avgEngagement.toFixed(2))
      };
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      throw new Error('Failed to fetch user analytics');
    }
  }

  /**
   * Search for Instagram Business accounts (very limited)
   * Note: This requires Instagram Business Discovery API which has restrictions
   */
  async searchInstagramBusinessAccounts(query: string): Promise<any[]> {
    try {
      // This is a placeholder - Instagram Business Discovery API requires special approval
      // and only works for business accounts that have been pre-approved
      const response = await axios.get(`${this.graphUrl}/ig_hashtag_search`, {
        params: {
          user_id: 'me', // Your Instagram Business account ID
          q: query,
          access_token: this.accessToken
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error searching Instagram business accounts:', error);
      return []; // Return empty array instead of throwing error
    }
  }

  /**
   * Get hashtag information and recent media
   */
  async getHashtagInfo(hashtag: string): Promise<any> {
    try {
      // First get hashtag ID
      const hashtagResponse = await axios.get(`${this.baseUrl}/ig_hashtag_search`, {
        params: {
          user_id: 'me',
          q: hashtag,
          access_token: this.accessToken
        }
      });

      if (!hashtagResponse.data.data || hashtagResponse.data.data.length === 0) {
        throw new Error('Hashtag not found');
      }

      const hashtagId = hashtagResponse.data.data[0].id;

      // Get recent media for this hashtag
      const mediaResponse = await axios.get(`${this.baseUrl}/${hashtagId}/recent_media`, {
        params: {
          user_id: 'me',
          fields: 'id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count',
          access_token: this.accessToken
        }
      });

      return {
        hashtag_info: hashtagResponse.data.data[0],
        recent_media: mediaResponse.data.data || []
      };
    } catch (error) {
      console.error('Error fetching hashtag info:', error);
      throw new Error('Failed to fetch hashtag information');
    }
  }

  /**
   * Validate Instagram access token
   */
  async validateToken(): Promise<{ valid: boolean; user?: InstagramUser; error?: string }> {
    try {
      const user = await this.getUserProfile();
      return { valid: true, user };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
