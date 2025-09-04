#!/bin/bash

# InfluenceTie Quick Railway Deployment Script
echo "🚂 InfluenceTie Railway Deployment Script"
echo "========================================"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Railway CLI"
        exit 1
    fi
fi

echo "✅ Railway CLI found"

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway..."
    railway login
fi

echo "✅ Logged into Railway"

# Check if project is linked
if ! railway status &> /dev/null; then
    echo "🔗 Linking to Railway project..."
    echo "Choose: Create new project or link existing"
    railway link
fi

echo "✅ Project linked"

# Add PostgreSQL if not exists
echo "🗃️  Adding PostgreSQL database..."
railway add postgresql || echo "Database service already exists"

echo "✅ Database configured"

# Build the project
echo "🏗️  Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi

echo "✅ Build successful"

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment successful!"
    echo "📊 Check your deployment:"
    echo "   Railway Dashboard: https://railway.app/dashboard"
    echo "   Logs: railway logs"
    echo "   Status: railway status"
    echo ""
    echo "⚙️  Next steps:"
    echo "1. Set environment variables in Railway dashboard"
    echo "2. Test your API endpoints"
    echo "3. Connect your frontend"
    echo ""
    echo "🔗 Your API will be available at:"
    railway domain
else
    echo "❌ Deployment failed. Check logs:"
    railway logs
    exit 1
fi
