#!/bin/bash

# Stripe Terminal POS - Production Deployment Script
# Deploy to 161.35.229.94

echo "🚀 Starting Stripe Terminal POS deployment..."

# Stop any existing processes
echo "📋 Stopping existing Node.js processes..."
pkill -f "node server.js" || echo "No existing processes found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Verify environment variables
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with your Stripe API keys"
    exit 1
fi

# Check if Stripe keys are configured
if grep -q "your_secret_key_here" .env || grep -q "your_publishable_key_here" .env; then
    echo "❌ Error: Please update your Stripe API keys in .env file"
    exit 1
fi

# Start the application in production mode
echo "🎯 Starting production server..."
echo "🌐 Server will be available at: http://161.35.229.94:3000"
echo "💳 Make sure your Stripe Terminal is connected to the same network"
echo ""

# Set production environment and start
export NODE_ENV=production
nohup npm run production > pos.log 2>&1 &

echo "✅ Deployment complete!"
echo "📊 Check logs with: tail -f pos.log"
echo "🔗 Access your POS at: http://161.35.229.94:3000"