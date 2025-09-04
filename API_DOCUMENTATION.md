# InfluenceTie Instagram API Documentation

## Overview

InfluenceTie provides a comprehensive API for managing Instagram influencer data using Instagram Graph API. This system allows you to connect Instagram Business/Creator accounts, fetch their analytics, media, and manage influencer profiles.

## 🚨 Important Limitations

**Instagram Graph API Constraints:**
- ❌ Cannot search for random users by name
- ❌ Cannot access data from users who haven't authorized your app
- ❌ No public profile search functionality
- ✅ Can only access data from connected/authorized accounts

**What Works:**
- ✅ Connected users' profile data and analytics
- ✅ Media/posts from authorized accounts
- ✅ Instagram Business Discovery (limited and requires approval)
- ✅ Hashtag information (limited to your business account)

## 🚀 Getting Started

1. **Start the server:**
```bash
npm run dev
```

2. **Test the integration:**
```bash
node test-instagram-api.js
```

## 📋 API Endpoints

### Base URL
```
http://localhost:4000/api
```

### Authentication
Some endpoints require Instagram access tokens to be passed in the request.

---

## 👥 Influencers Endpoints

### 1. Get All Connected Influencers
```http
GET /api/influencers
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1786297942765481",
      "instagram_user_id": "1786297942765481",
      "username": "hritik_kumar",
      "display_name": "Hritik Kumar",
      "profile_picture": "https://...",
      "followers_count": 1500,
      "engagement_rate": 3.45,
      "categories": ["tech", "lifestyle"],
      "rate_per_post": 1000,
      "rate_per_story": 500,
      "verified": true,
      "status": "active",
      "avg_likes": 120,
      "avg_comments": 15,
      "total_posts": 50,
      "last_updated": "2024-12-19T..."
    }
  ],
  "total": 1,
  "message": "Connected influencers retrieved successfully"
}
```

### 2. Connect Instagram Account
```http
POST /api/influencers/connect
```

**Request Body:**
```json
{
  "access_token": "EAALAmzsn5foBPUH...",
  "user_id": "optional_specific_user_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "1786297942765481",
      "username": "hritik_kumar",
      "followers_count": 1500,
      "engagement_rate": 3.45,
      // ... full profile data
    },
    "insights": {
      "followers_count": 1500,
      "profile_views": 450,
      "reach": 1200,
      "impressions": 2500
    },
    "recent_posts": [
      {
        "id": "post_id",
        "media_type": "IMAGE",
        "media_url": "https://...",
        "like_count": 150,
        "comments_count": 20
      }
    ]
  },
  "message": "Instagram account connected successfully"
}
```

### 3. Get Influencer Profile
```http
GET /api/influencers/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1786297942765481",
    "username": "hritik_kumar",
    "display_name": "Hritik Kumar",
    "followers_count": 1500,
    "engagement_rate": 3.45,
    "recent_posts": [...],
    // ... full profile data
  }
}
```

### 4. Get Detailed Analytics
```http
GET /api/influencers/:id/analytics?access_token=YOUR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": {
      "username": "hritik_kumar",
      "followers_count": 1500,
      "media_count": 50
    },
    "recentPosts": [...],
    "insights": {
      "followers_count": 1500,
      "profile_views": 450,
      "reach": 1200,
      "impressions": 2500,
      "period": "day"
    },
    "avgEngagement": 3.45
  }
}
```

### 5. Get User Media/Posts
```http
GET /api/influencers/:id/media?access_token=YOUR_TOKEN&limit=25
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "media_id",
      "media_type": "IMAGE",
      "media_url": "https://...",
      "permalink": "https://www.instagram.com/p/...",
      "caption": "Amazing sunset! #photography",
      "timestamp": "2024-12-19T10:30:00Z",
      "like_count": 150,
      "comments_count": 20,
      "thumbnail_url": "https://..."
    }
  ],
  "total": 25
}
```

### 6. Update Influencer Rates
```http
PUT /api/influencers/:id/rates
```

**Request Body:**
```json
{
  "rate_per_post": 2000,
  "rate_per_story": 1000,
  "categories": ["tech", "lifestyle", "photography"],
  "email": "influencer@example.com",
  "phone": "+91-9999999999"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    // ... updated influencer profile
    "rate_per_post": 2000,
    "rate_per_story": 1000,
    "categories": ["tech", "lifestyle", "photography"]
  },
  "message": "Influencer rates updated successfully"
}
```

### 7. Search Hashtags (Limited)
```http
POST /api/influencers/search/hashtag
```

**Request Body:**
```json
{
  "access_token": "YOUR_TOKEN",
  "query": "tech"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hashtag_info": {
      "id": "hashtag_id",
      "name": "tech"
    },
    "recent_media": [
      {
        "id": "media_id",
        "media_type": "IMAGE",
        "caption": "Latest tech gadget! #tech",
        "like_count": 500
      }
    ]
  }
}
```

---

## 💡 Usage Examples

### JavaScript/Node.js Example
```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:4000/api';
const INSTAGRAM_TOKEN = 'your_instagram_token_here';

// Connect Instagram account
async function connectInstagram() {
  try {
    const response = await axios.post(`${API_BASE}/influencers/connect`, {
      access_token: INSTAGRAM_TOKEN
    });
    
    console.log('Connected:', response.data.data.profile.username);
    return response.data.data.profile.id;
  } catch (error) {
    console.error('Connection failed:', error.response.data);
  }
}

// Get user analytics
async function getAnalytics(userId) {
  try {
    const response = await axios.get(`${API_BASE}/influencers/${userId}/analytics`, {
      params: { access_token: INSTAGRAM_TOKEN }
    });
    
    console.log('Analytics:', response.data.data);
  } catch (error) {
    console.error('Analytics failed:', error.response.data);
  }
}

// Usage
connectInstagram().then(userId => {
  if (userId) {
    getAnalytics(userId);
  }
});
```

### Frontend (React) Example
```jsx
import React, { useState } from 'react';
import axios from 'axios';

function InstagramConnector() {
  const [token, setToken] = useState('');
  const [influencer, setInfluencer] = useState(null);
  const [loading, setLoading] = useState(false);

  const connectInstagram = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/influencers/connect', {
        access_token: token
      });
      setInfluencer(response.data.data.profile);
    } catch (error) {
      alert('Connection failed: ' + error.response.data.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Connect Instagram Account</h2>
      <input
        type="text"
        placeholder="Instagram Access Token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        style={{ width: '400px', padding: '10px' }}
      />
      <button onClick={connectInstagram} disabled={loading}>
        {loading ? 'Connecting...' : 'Connect'}
      </button>

      {influencer && (
        <div style={{ marginTop: '20px' }}>
          <h3>Connected Successfully!</h3>
          <img src={influencer.profile_picture} alt="Profile" width="100" />
          <p>Username: @{influencer.username}</p>
          <p>Followers: {influencer.followers_count}</p>
          <p>Engagement Rate: {influencer.engagement_rate}%</p>
        </div>
      )}
    </div>
  );
}

export default InstagramConnector;
```

---

## 🔧 Environment Setup

Create a `.env` file in your project root:

```env
PORT=4000
CORS_ORIGIN=http://localhost:5173

# Instagram Configuration
INSTAGRAM_APP_ID=774722898355706
INSTAGRAM_APP_SECRET=your_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:4000/api/auth/instagram/callback

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Database (when implemented)
DATABASE_URL=your_database_url
```

---

## 🛠️ How Real Platforms Work

### Upfluence/Hypsee Strategy:
1. **User Onboarding**: Influencers voluntarily connect their accounts
2. **Multi-source Data**: Combine Instagram API + web scraping + manual data
3. **Official Partnerships**: Special API access through Instagram partnerships
4. **Third-party Providers**: Purchase data from services like Social Blade
5. **Manual Curation**: Human team verifies and enriches data

### What You Can Build:
1. **Influencer Network**: Platform where influencers register and connect accounts
2. **Campaign Management**: Brands can find and collaborate with registered influencers
3. **Analytics Dashboard**: Deep insights for connected accounts
4. **Rate Management**: Influencers set their own rates
5. **Portfolio Showcase**: Influencers showcase their best content

---

## 📊 Sample Workflow

1. **Influencer Registration**:
   ```
   Influencer signs up → Connects Instagram → Profile auto-populated
   ```

2. **Brand Discovery**:
   ```
   Brand searches by category → Views influencer profiles → Initiates campaign
   ```

3. **Campaign Management**:
   ```
   Campaign created → Influencers apply → Brand selects → Content created → Analytics tracked
   ```

---

## 🔍 Testing

Run the test script to verify your Instagram integration:

```bash
node test-instagram-api.js
```

This will test:
- ✅ Instagram account connection
- ✅ Analytics retrieval
- ✅ Media fetching
- ✅ Rate updates
- ⚠️ Hashtag search (may fail due to API limitations)

---

## 🚨 Error Handling

Common errors and solutions:

### 400 - Invalid Access Token
```json
{
  "success": false,
  "message": "Invalid Instagram access token",
  "error": "Token validation failed"
}
```
**Solution**: Check if your token is valid and not expired.

### 403 - Insufficient Permissions
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```
**Solution**: Ensure your token has required Instagram permissions (instagram_basic, instagram_manage_insights, etc.).

### 404 - Influencer Not Found
```json
{
  "success": false,
  "message": "Influencer not found"
}
```
**Solution**: Verify the influencer ID exists in your system.

---

## 🎯 Next Steps

1. **Add Database**: Replace in-memory storage with PostgreSQL/MongoDB
2. **User Authentication**: Implement JWT-based user system
3. **Campaign Management**: Add campaign creation and management features
4. **Email Integration**: Send notifications and reports
5. **Advanced Analytics**: Add more detailed reporting and insights
6. **Rate Limiting**: Implement API rate limiting
7. **WebSocket Integration**: Real-time updates for campaigns

---

## 📞 Support

For questions or issues with the Instagram integration, check:

1. Instagram Graph API documentation
2. Your app's permissions in Facebook Developer Console
3. Token expiration and refresh requirements
4. API rate limits and quotas
