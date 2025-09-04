export interface InstagramUser {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  biography?: string;
  website?: string;
  account_type?: 'PERSONAL' | 'BUSINESS' | 'CREATOR';
  media?: InstagramMedia[];
  insights?: InstagramInsights;
}

export interface InstagramMedia {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  caption?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  thumbnail_url?: string;
  children?: InstagramMediaChild[];
  insights?: InstagramMediaInsights;
}

export interface InstagramMediaChild {
  id: string;
  media_type: 'IMAGE' | 'VIDEO';
  media_url: string;
  thumbnail_url?: string;
}

export interface InstagramInsights {
  followers_count?: number;
  profile_views?: number;
  reach?: number;
  impressions?: number;
  engagement?: number;
  period?: string;
}

export interface InstagramMediaInsights {
  impressions?: number;
  reach?: number;
  engagement?: number;
  saves?: number;
  video_views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}

export interface InstagramApiResponse<T> {
  data: T;
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
}

export interface InfluencerProfile {
  id: string;
  instagram_user_id: string;
  username: string;
  display_name: string;
  profile_picture: string;
  followers_count: number;
  engagement_rate: number;
  categories: string[];
  location?: string;
  email?: string;
  phone?: string;
  rate_per_post?: number;
  rate_per_story?: number;
  verified: boolean;
  last_updated: Date;
  status: 'active' | 'inactive' | 'pending';
  // Analytics data
  avg_likes: number;
  avg_comments: number;
  total_posts: number;
  recent_posts: InstagramMedia[];
}
