#!/bin/bash

# AWS EC2 Deployment Script for InfluenceTie Backend
# Make sure to run: chmod +x scripts/aws/deploy.sh

set -e

echo "🚀 Starting AWS EC2 deployment..."

# Configuration
APP_NAME="influencetie-backend"
DOCKER_IMAGE="$APP_NAME:latest"
CONTAINER_NAME="$APP_NAME-container"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found! Please create it with required environment variables."
    exit 1
fi

# Stop and remove existing container
print_status "Stopping existing container..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Remove old image
print_status "Removing old Docker image..."
docker rmi $DOCKER_IMAGE 2>/dev/null || true

# Build new Docker image
print_status "Building Docker image..."
docker build -t $DOCKER_IMAGE .

# Run database setup (if needed)
print_status "Running database setup..."
docker run --rm --env-file .env $DOCKER_IMAGE npm run db:setup || print_warning "Database setup failed or already completed"

# Start new container
print_status "Starting new container..."
docker run -d \
    --name $CONTAINER_NAME \
    --env-file .env \
    -p 4000:4000 \
    --restart unless-stopped \
    $DOCKER_IMAGE

# Wait for container to start
sleep 5

# Check if container is running
if docker ps | grep -q $CONTAINER_NAME; then
    print_status "✅ Deployment successful!"
    print_status "Container is running on port 4000"
    print_status "Health check: curl http://localhost:4000/health"
else
    print_error "❌ Deployment failed!"
    print_error "Container logs:"
    docker logs $CONTAINER_NAME
    exit 1
fi

# Show container status
docker ps | grep $CONTAINER_NAME
