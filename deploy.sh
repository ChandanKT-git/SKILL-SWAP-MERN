#!/bin/bash

# SkillSwap Deployment Script
# This script automates the deployment process

set -e

echo "🚀 Starting SkillSwap Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
BRANCH=${2:-main}

echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
echo -e "${YELLOW}Branch: $BRANCH${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

if ! command_exists git; then
    echo -e "${RED}❌ Git is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Pull latest code
echo "📥 Pulling latest code from $BRANCH..."
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm ci --production=false

# Run backend tests
echo "🧪 Running backend tests..."
npm test -- --passWithNoTests

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm ci --production=false

# Run frontend tests
echo "🧪 Running frontend tests..."
npm test -- --passWithNoTests

# Build frontend
echo "🏗️  Building frontend..."
npm run build

# Copy environment files
echo "⚙️  Setting up environment configuration..."
cd ..

if [ "$ENVIRONMENT" = "production" ]; then
    if [ ! -f backend/.env.production ]; then
        echo -e "${RED}❌ backend/.env.production not found${NC}"
        exit 1
    fi
    cp backend/.env.production backend/.env
    
    if [ ! -f frontend/.env.production ]; then
        echo -e "${RED}❌ frontend/.env.production not found${NC}"
        exit 1
    fi
    cp frontend/.env.production frontend/.env
else
    echo -e "${YELLOW}⚠️  Using existing .env files for $ENVIRONMENT${NC}"
fi

# Database migration (if needed)
echo "🗄️  Checking database migrations..."
# Add your migration commands here if you have any
# cd backend && npm run migrate

# Start/Restart application with PM2
echo "🔄 Restarting application..."

if command_exists pm2; then
    pm2 delete skillswap-backend 2>/dev/null || true
    pm2 start ecosystem.config.js --env $ENVIRONMENT
    pm2 save
    echo -e "${GREEN}✅ Application started with PM2${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 not found. Starting with node...${NC}"
    cd backend
    NODE_ENV=$ENVIRONMENT node src/server.js &
    echo $! > ../skillswap.pid
    echo -e "${GREEN}✅ Application started (PID saved to skillswap.pid)${NC}"
fi

# Health check
echo "🏥 Performing health check..."
sleep 5

BACKEND_URL="http://localhost:5000"
if curl -f -s "$BACKEND_URL/api/health" > /dev/null; then
    echo -e "${GREEN}✅ Backend health check passed${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    exit 1
fi

# Display status
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "📊 Application Status:"
if command_exists pm2; then
    pm2 status
fi

echo ""
echo "📝 Next steps:"
echo "  - Monitor logs: pm2 logs skillswap-backend"
echo "  - Check status: pm2 status"
echo "  - View metrics: pm2 monit"
echo ""
echo -e "${GREEN}✨ Happy skill swapping!${NC}"
