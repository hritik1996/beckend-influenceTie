-- InfluenceTie Database Schema
-- PostgreSQL version

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('INFLUENCER', 'BRAND', 'ADMIN');
CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
CREATE TYPE campaign_status AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE message_type AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT');

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar TEXT,
    role user_role DEFAULT 'INFLUENCER',
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    otp VARCHAR(6),
    otp_expiry TIMESTAMP,
    
    -- Profile information
    bio TEXT,
    website VARCHAR(255),
    location VARCHAR(255),
    date_of_birth DATE,
    gender gender,
    
    -- Influencer specific fields
    instagram_handle VARCHAR(50) UNIQUE,
    instagram_id VARCHAR(100),
    followers_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2),
    categories TEXT[], -- Array of categories like ["fashion", "lifestyle", "fitness"]
    rates JSONB, -- Pricing: {"post": 5000, "reel": 8000, "story": 2000}
    
    -- Additional flexible data as JSON
    instagram_data JSONB, -- Store Instagram API responses
    preferences JSONB DEFAULT '{}', -- User preferences and settings
    analytics JSONB DEFAULT '{}', -- Performance analytics data
    
    -- Brand specific fields
    company_name VARCHAR(255),
    industry VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone ~* '^[+]?[1-9]\d{1,14}$'),
    CONSTRAINT valid_instagram_handle CHECK (instagram_handle ~* '^[a-zA-Z0-9_]{1,30}$'),
    CONSTRAINT valid_followers_count CHECK (followers_count >= 0),
    CONSTRAINT valid_engagement_rate CHECK (engagement_rate >= 0 AND engagement_rate <= 100)
);

-- Campaigns table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    budget DECIMAL(10,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    requirements TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    status campaign_status DEFAULT 'DRAFT',
    
    -- Flexible campaign data as JSON
    requirements_json JSONB, -- Detailed requirements, criteria, deliverables
    target_audience JSONB, -- Age range, interests, locations etc
    content_guidelines JSONB, -- Hashtags, mentions, content types
    
    -- Brand info (foreign key)
    brand_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_budget CHECK (budget > 0),
    CONSTRAINT valid_dates CHECK (end_date > start_date)
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    type message_type DEFAULT 'TEXT',
    is_read BOOLEAN DEFAULT FALSE,
    
    -- Sender and receiver (foreign keys)
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT different_users CHECK (sender_id != receiver_id)
);

-- Campaign Participants table (many-to-many relationship)
CREATE TABLE campaign_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    influencer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'INVITED', -- INVITED, ACCEPTED, REJECTED, COMPLETED
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Negotiation and terms
    proposed_rate DECIMAL(10,2),
    agreed_rate DECIMAL(10,2),
    deliverables JSONB, -- What content to deliver
    
    -- Performance tracking
    content_submitted JSONB, -- Links to submitted content
    performance_metrics JSONB, -- Views, likes, engagement etc
    
    -- Payment tracking
    payment_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PAID, DISPUTED
    payment_date TIMESTAMP,
    
    UNIQUE(campaign_id, influencer_id)
);

-- Analytics Events table (for tracking user actions)
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL, -- login, campaign_view, message_sent, etc
    event_data JSONB, -- Flexible event properties
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content Posts table (for tracking submitted content)
CREATE TABLE content_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_participant_id UUID NOT NULL REFERENCES campaign_participants(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL, -- instagram, youtube, tiktok
    post_type VARCHAR(20) NOT NULL, -- post, reel, story, video
    post_url TEXT NOT NULL,
    caption TEXT,
    hashtags TEXT[],
    
    -- Performance metrics
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2),
    
    -- Metadata
    posted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table (for payment tracking)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    campaign_participant_id UUID REFERENCES campaign_participants(id) ON DELETE SET NULL,
    
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    transaction_type VARCHAR(20) NOT NULL, -- CAMPAIGN_PAYMENT, PLATFORM_FEE, REFUND
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, COMPLETED, FAILED, CANCELLED
    
    -- Payment gateway details
    gateway_transaction_id VARCHAR(100),
    gateway_name VARCHAR(50), -- razorpay, stripe, paytm
    
    -- Metadata
    description TEXT,
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_instagram_handle ON users(instagram_handle);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_followers_count ON users(followers_count);
CREATE INDEX idx_users_engagement_rate ON users(engagement_rate);
CREATE INDEX idx_users_categories ON users USING GIN(categories);
CREATE INDEX idx_users_location ON users(location);

-- JSON indexes for flexible data
CREATE INDEX idx_users_instagram_data ON users USING GIN(instagram_data);
CREATE INDEX idx_users_preferences ON users USING GIN(preferences);
CREATE INDEX idx_users_analytics ON users USING GIN(analytics);
CREATE INDEX idx_users_rates ON users USING GIN(rates);

-- Campaigns table indexes
CREATE INDEX idx_campaigns_brand_id ON campaigns(brand_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_category ON campaigns(category);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX idx_campaigns_budget ON campaigns(budget);

-- Campaign JSON indexes
CREATE INDEX idx_campaigns_requirements ON campaigns USING GIN(requirements_json);
CREATE INDEX idx_campaigns_target_audience ON campaigns USING GIN(target_audience);
CREATE INDEX idx_campaigns_content_guidelines ON campaigns USING GIN(content_guidelines);

-- Messages table indexes
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_is_read ON messages(is_read);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Full-text search indexes
CREATE INDEX idx_users_bio_fulltext ON users USING GIN(to_tsvector('english', bio));
CREATE INDEX idx_campaigns_description_fulltext ON campaigns USING GIN(to_tsvector('english', description));

-- Campaign Participants indexes
CREATE INDEX idx_campaign_participants_campaign_id ON campaign_participants(campaign_id);
CREATE INDEX idx_campaign_participants_influencer_id ON campaign_participants(influencer_id);
CREATE INDEX idx_campaign_participants_status ON campaign_participants(status);
CREATE INDEX idx_campaign_participants_payment_status ON campaign_participants(payment_status);
CREATE INDEX idx_campaign_participants_deliverables ON campaign_participants USING GIN(deliverables);

-- Analytics Events indexes
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_data ON analytics_events USING GIN(event_data);

-- Content Posts indexes
CREATE INDEX idx_content_posts_participant_id ON content_posts(campaign_participant_id);
CREATE INDEX idx_content_posts_platform ON content_posts(platform);
CREATE INDEX idx_content_posts_type ON content_posts(post_type);
CREATE INDEX idx_content_posts_posted_at ON content_posts(posted_at);
CREATE INDEX idx_content_posts_hashtags ON content_posts USING GIN(hashtags);

-- Transactions indexes
CREATE INDEX idx_transactions_from_user ON transactions(from_user_id);
CREATE INDEX idx_transactions_to_user ON transactions(to_user_id);
CREATE INDEX idx_transactions_campaign ON transactions(campaign_id);
CREATE INDEX idx_transactions_participant ON transactions(campaign_participant_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_gateway ON transactions(gateway_transaction_id);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at columns
CREATE TRIGGER users_update_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER campaigns_update_trigger
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER messages_update_trigger
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER content_posts_update_trigger
    BEFORE UPDATE ON content_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER transactions_update_trigger
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Insert default admin user (password: Admin123)
INSERT INTO users (
    email, 
    password, 
    first_name, 
    last_name, 
    role, 
    is_email_verified,
    created_at
) VALUES (
    'admin@influencetie.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3hqX9M0Ztu', -- Admin123
    'Admin',
    'User',
    'ADMIN',
    TRUE,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;
