#!/bin/bash

# DigitalOcean Deployment Script
# This script helps deploy your app using the DigitalOcean CLI (doctl)

set -e  # Exit on error

echo "🚀 DigitalOcean Deployment Script"
echo "=================================="

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ doctl is not installed"
    echo "📦 Install it with: brew install doctl  (macOS)"
    echo "   or visit: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Check if authenticated
if ! doctl auth list &> /dev/null; then
    echo "🔑 Not authenticated with DigitalOcean"
    echo "Run: doctl auth init"
    exit 1
fi

echo "✅ doctl is installed and authenticated"
echo ""

# Check if app exists
APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep "grok-chat-app" | awk '{print $1}' || echo "")

if [ -z "$APP_ID" ]; then
    echo "📦 Creating new app..."
    echo "⚠️  Make sure to set XAI_API_KEY in the DigitalOcean dashboard after creation!"
    
    # Create the app
    doctl apps create --spec .do/app.yaml
    
    echo "✅ App created!"
    echo "🔗 View your app: https://cloud.digitalocean.com/apps"
else
    echo "🔄 Updating existing app (ID: $APP_ID)..."
    
    # Update the app
    doctl apps update $APP_ID --spec .do/app.yaml
    
    echo "✅ App updated!"
fi

echo ""
echo "📋 Next steps:"
echo "1. Set XAI_API_KEY in the DigitalOcean dashboard"
echo "2. Wait for deployment to complete (usually 5-10 minutes)"
echo "3. Check deployment status: doctl apps list"
echo "4. View logs: doctl apps logs $APP_ID --type=run"
echo ""
echo "🌐 Access your app at the URL shown in the dashboard"
