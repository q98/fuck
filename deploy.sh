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

# Check if .env exists, if not, inform user about web setup
if [ ! -f .env ]; then
    echo "ℹ️  No .env file found - that's OK!"
    echo "🔐 You can configure Stripe keys through the web interface"
    echo "📝 Or create .env manually with your keys if preferred"
    echo ""
else
    echo "✅ Found existing .env file"
    
    # Check if Stripe keys are configured
    if grep -q "your_secret_key_here" .env || grep -q "your_publishable_key_here" .env; then
        echo "⚠️  Warning: Placeholder keys detected in .env"
        echo "🔐 You can update them through the web interface after starting"
    else
        echo "✅ Stripe keys appear to be configured"
    fi
fi

# Start the application in production mode
echo "🎯 Starting production server..."
echo "🌐 Server will be available at: http://161.35.229.94:3000"
echo "💳 Make sure your Stripe Terminal is connected to the same network"
echo ""

# Set production environment and start
export NODE_ENV=production
nohup npm run start:prod > pos.log 2>&1 &

echo "✅ Deployment complete!"
echo ""
echo "📊 Check logs with: tail -f pos.log"
echo "🔗 Access your POS at: http://161.35.229.94:3000"
echo ""
echo "🔐 FIRST TIME SETUP:"
echo "   1. Open http://161.35.229.94:3000 in your browser"
echo "   2. Enter your Stripe API keys in the setup modal"
echo "   3. Keys will be automatically saved and validated"
echo ""
echo "🔑 Get your Stripe keys at: https://dashboard.stripe.com/apikeys"