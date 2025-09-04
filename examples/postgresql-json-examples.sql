-- PostgreSQL JSON Examples for InfluenceTie Platform
-- Shows how PostgreSQL gives you MongoDB flexibility + SQL power

-- 1. Store Instagram API responses as JSON
CREATE TABLE instagram_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    instagram_response JSONB, -- Binary JSON for better performance
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example: Store Instagram profile data
INSERT INTO instagram_data (user_id, instagram_response) VALUES (
    'user_123',
    '{
        "id": "1234567890",
        "username": "fashion_influencer",
        "followers_count": 50000,
        "following_count": 1500,
        "media_count": 250,
        "biography": "Fashion & Lifestyle Blogger",
        "website": "https://fashionblog.com",
        "profile_picture_url": "https://instagram.com/profile.jpg",
        "recent_posts": [
            {
                "id": "post_1",
                "like_count": 2500,
                "comment_count": 150,
                "timestamp": "2024-01-15T10:30:00Z",
                "media_type": "IMAGE",
                "caption": "New winter collection! #fashion #style"
            },
            {
                "id": "post_2", 
                "like_count": 3200,
                "comment_count": 200,
                "timestamp": "2024-01-14T15:45:00Z",
                "media_type": "VIDEO",
                "caption": "Behind the scenes of today''s shoot"
            }
        ],
        "engagement_metrics": {
            "avg_likes": 2850,
            "avg_comments": 175,
            "engagement_rate": 5.7,
            "best_posting_time": "18:00-20:00",
            "top_hashtags": ["#fashion", "#style", "#ootd", "#lifestyle"]
        }
    }'::jsonb
);

-- 2. Query JSON data with SQL power
-- Get influencers with high engagement from fashion niche
SELECT 
    u.first_name,
    u.last_name,
    u.instagram_handle,
    ig.instagram_response->>'followers_count' as followers,
    ig.instagram_response->'engagement_metrics'->>'engagement_rate' as engagement_rate
FROM users u
JOIN instagram_data ig ON u.id = ig.user_id
WHERE u.role = 'INFLUENCER'
  AND (ig.instagram_response->>'followers_count')::int > 10000
  AND (ig.instagram_response->'engagement_metrics'->>'engagement_rate')::float > 4.0
  AND ig.instagram_response->'engagement_metrics'->'top_hashtags' ? 'fashion'
ORDER BY (ig.instagram_response->>'followers_count')::int DESC;

-- 3. Advanced JSON queries - find trending hashtags
SELECT 
    hashtag,
    COUNT(*) as usage_count,
    AVG((instagram_response->'engagement_metrics'->>'engagement_rate')::float) as avg_engagement
FROM instagram_data,
     jsonb_array_elements_text(instagram_response->'engagement_metrics'->'top_hashtags') as hashtag
WHERE fetched_at >= NOW() - INTERVAL '30 days'
GROUP BY hashtag
HAVING COUNT(*) >= 5
ORDER BY usage_count DESC, avg_engagement DESC
LIMIT 20;

-- 4. Store campaign requirements as flexible JSON
ALTER TABLE campaigns ADD COLUMN requirements_json JSONB;

-- Example campaign with flexible requirements
UPDATE campaigns SET requirements_json = '{
    "target_audience": {
        "age_range": [18, 35],
        "gender": ["female"],
        "interests": ["fashion", "beauty", "lifestyle"],
        "locations": ["Mumbai", "Delhi", "Bangalore"]
    },
    "content_requirements": {
        "post_types": ["reel", "story", "post"],
        "min_posts": 3,
        "hashtags_required": ["#brandname", "#newcollection"],
        "mention_required": true,
        "content_approval": true
    },
    "influencer_criteria": {
        "min_followers": 10000,
        "max_followers": 100000,
        "min_engagement_rate": 3.0,
        "verified_account": false,
        "previous_brand_collaborations": {
            "allowed": true,
            "exclude_competitors": ["competitor1", "competitor2"]
        }
    },
    "deliverables": [
        {
            "type": "instagram_reel",
            "quantity": 1,
            "duration_seconds": 30,
            "deadline": "2024-02-15"
        },
        {
            "type": "instagram_story",
            "quantity": 3,
            "deadline": "2024-02-10"
        }
    ],
    "payment_terms": {
        "total_amount": 25000,
        "currency": "INR",
        "payment_schedule": [
            {"percentage": 50, "milestone": "content_approval"},
            {"percentage": 50, "milestone": "campaign_completion"}
        ]
    }
}'::jsonb WHERE id = 'campaign_123';

-- 5. Match influencers to campaigns using JSON criteria
SELECT 
    u.first_name,
    u.last_name,
    u.instagram_handle,
    ig.instagram_response->>'followers_count' as followers,
    ig.instagram_response->'engagement_metrics'->>'engagement_rate' as engagement,
    c.title as campaign_title
FROM users u
JOIN instagram_data ig ON u.id = ig.user_id
CROSS JOIN campaigns c
WHERE u.role = 'INFLUENCER'
  AND c.status = 'ACTIVE'
  -- Check follower range
  AND (ig.instagram_response->>'followers_count')::int >= 
      (c.requirements_json->'influencer_criteria'->>'min_followers')::int
  AND (ig.instagram_response->>'followers_count')::int <= 
      (c.requirements_json->'influencer_criteria'->>'max_followers')::int
  -- Check engagement rate
  AND (ig.instagram_response->'engagement_metrics'->>'engagement_rate')::float >= 
      (c.requirements_json->'influencer_criteria'->>'min_engagement_rate')::float
  -- Check if influencer has required interests
  AND ig.instagram_response->'engagement_metrics'->'top_hashtags' ?| 
      ARRAY(SELECT jsonb_array_elements_text(c.requirements_json->'target_audience'->'interests'))
ORDER BY (ig.instagram_response->>'followers_count')::int DESC;

-- 6. Create indexes for better JSON query performance
CREATE INDEX idx_instagram_followers ON instagram_data 
USING GIN ((instagram_response->'engagement_metrics'));

CREATE INDEX idx_instagram_hashtags ON instagram_data 
USING GIN ((instagram_response->'engagement_metrics'->'top_hashtags'));

CREATE INDEX idx_campaign_requirements ON campaigns 
USING GIN (requirements_json);

-- 7. Store user preferences and settings as JSON
ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}';

-- Example user preferences
UPDATE users SET preferences = '{
    "notification_settings": {
        "email_notifications": true,
        "push_notifications": true,
        "campaign_matches": true,
        "payment_updates": true
    },
    "profile_visibility": {
        "public_profile": true,
        "show_rates": true,
        "show_past_campaigns": false
    },
    "content_preferences": {
        "preferred_brands": ["fashion", "beauty", "lifestyle"],
        "avoid_categories": ["alcohol", "gambling"],
        "content_types": ["reels", "posts", "stories"],
        "posting_schedule": {
            "best_days": ["monday", "wednesday", "friday"],
            "best_times": ["18:00", "20:00"]
        }
    },
    "collaboration_settings": {
        "auto_accept_rate_matches": false,
        "require_content_approval": true,
        "min_campaign_duration": 7,
        "preferred_payment_terms": "50_50_split"
    }
}'::jsonb WHERE role = 'INFLUENCER';

-- Query based on user preferences
SELECT 
    u.first_name,
    u.last_name,
    u.preferences->'collaboration_settings'->>'min_campaign_duration' as min_duration,
    u.preferences->'content_preferences'->'preferred_brands' as preferred_brands
FROM users u
WHERE u.role = 'INFLUENCER'
  AND u.preferences->'notification_settings'->>'campaign_matches' = 'true'
  AND u.preferences->'content_preferences'->'preferred_brands' ? 'fashion';
