const axios = require('axios');

// Your Instagram Graph API token - REPLACE WITH FRESH TOKEN
const INSTAGRAM_TOKEN = 'REPLACE_WITH_YOUR_FRESH_TOKEN_HERE';

// NOTE: If you get "Invalid OAuth access token" error, your token has expired.
// Open get-instagram-token.html in your browser to get a fresh token.

// Base URL for your backend API
const BASE_URL = 'http://localhost:4000/api';

async function testInstagramIntegration() {
  try {
    console.log('🧪 Testing Instagram API Integration...\n');
    
    // Test 1: Connect Instagram account
    console.log('1. Testing Instagram Account Connection...');
    const connectResponse = await axios.post(`${BASE_URL}/influencers/connect`, {
      access_token: INSTAGRAM_TOKEN
    });
    
    console.log('✅ Connection successful!');
    console.log(`Username: ${connectResponse.data.data.profile.username}`);
    console.log(`Followers: ${connectResponse.data.data.profile.followers_count}`);
    console.log(`Engagement Rate: ${connectResponse.data.data.profile.engagement_rate}%\n`);
    
    const userId = connectResponse.data.data.profile.id;
    
    // Test 2: Get user analytics
    console.log('2. Testing Analytics Endpoint...');
    const analyticsResponse = await axios.get(`${BASE_URL}/influencers/${userId}/analytics`, {
      params: { access_token: INSTAGRAM_TOKEN }
    });
    
    console.log('✅ Analytics retrieved successfully!');
    console.log(`Profile views: ${analyticsResponse.data.data.insights.profile_views || 'N/A'}`);
    console.log(`Average likes: ${Math.round(analyticsResponse.data.data.profile.followers_count ? analyticsResponse.data.data.avgEngagement : 0)}\n`);
    
    // Test 3: Get user media
    console.log('3. Testing Media Endpoint...');
    const mediaResponse = await axios.get(`${BASE_URL}/influencers/${userId}/media`, {
      params: { access_token: INSTAGRAM_TOKEN, limit: 5 }
    });
    
    console.log('✅ Media retrieved successfully!');
    console.log(`Found ${mediaResponse.data.data.length} recent posts`);
    if (mediaResponse.data.data.length > 0) {
      const latestPost = mediaResponse.data.data[0];
      console.log(`Latest post: ${latestPost.media_type} - ${latestPost.like_count || 0} likes, ${latestPost.comments_count || 0} comments\n`);
    }
    
    // Test 4: Get all connected influencers
    console.log('4. Testing Get All Influencers...');
    const allInfluencersResponse = await axios.get(`${BASE_URL}/influencers`);
    
    console.log('✅ All influencers retrieved successfully!');
    console.log(`Total connected influencers: ${allInfluencersResponse.data.total}\n`);
    
    // Test 5: Update influencer rates
    console.log('5. Testing Rate Update...');
    const rateUpdateResponse = await axios.put(`${BASE_URL}/influencers/${userId}/rates`, {
      rate_per_post: 1000,
      rate_per_story: 500,
      categories: ['lifestyle', 'tech'],
      email: 'hritik@influencetie.com'
    });
    
    console.log('✅ Rates updated successfully!');
    console.log(`Rate per post: ₹${rateUpdateResponse.data.data.rate_per_post}`);
    console.log(`Rate per story: ₹${rateUpdateResponse.data.data.rate_per_story}\n`);
    
    // Test 6: Try hashtag search (might fail due to API limitations)
    console.log('6. Testing Hashtag Search (might fail due to API limitations)...');
    try {
      const hashtagResponse = await axios.post(`${BASE_URL}/influencers/search/hashtag`, {
        access_token: INSTAGRAM_TOKEN,
        query: 'tech'
      });
      console.log('✅ Hashtag search successful!');
      console.log(`Found hashtag data:`, hashtagResponse.data.data.hashtag_info);
    } catch (hashtagError) {
      console.log('⚠️ Hashtag search failed (expected due to API limitations)');
      console.log(`Error: ${hashtagError.response?.data?.message || hashtagError.message}\n`);
    }
    
    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Instagram account connected: ${connectResponse.data.data.profile.username}`);
    console.log(`- Followers: ${connectResponse.data.data.profile.followers_count}`);
    console.log(`- Engagement rate: ${connectResponse.data.data.profile.engagement_rate}%`);
    console.log(`- Recent posts: ${mediaResponse.data.data.length}`);
    console.log(`- Total connected influencers in system: ${allInfluencersResponse.data.total}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.log('\n🔍 Debugging info:');
      console.log('- Check if your Instagram token is valid and not expired');
      console.log('- Ensure your token has the required permissions');
      console.log('- Verify your Instagram account is a Business or Creator account for insights');
    }
  }
}

// Helper function to test individual endpoints
async function testEndpoint(method, url, data = null, params = null) {
  try {
    const config = { params };
    let response;
    
    switch (method.toLowerCase()) {
      case 'get':
        response = await axios.get(url, config);
        break;
      case 'post':
        response = await axios.post(url, data, config);
        break;
      case 'put':
        response = await axios.put(url, data, config);
        break;
      default:
        throw new Error('Unsupported HTTP method');
    }
    
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Function to validate Instagram token directly with Graph API
async function validateInstagramToken(token) {
  try {
    const response = await axios.get(`https://graph.instagram.com/me`, {
      params: {
        fields: 'id,username,name,followers_count,media_count',
        access_token: token
      }
    });
    
    console.log('✅ Token is valid!');
    console.log('User data:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Token validation failed:', error.response?.data || error.message);
    return false;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  console.log('🚀 Starting Instagram API Integration Tests...\n');
  
  // First validate the token
  validateInstagramToken(INSTAGRAM_TOKEN).then(isValid => {
    if (isValid) {
      // Give some time for the server to start if needed
      setTimeout(testInstagramIntegration, 2000);
    } else {
      console.log('❌ Cannot proceed with tests - invalid Instagram token');
    }
  });
}
