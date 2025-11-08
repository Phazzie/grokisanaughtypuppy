#!/bin/bash
set -e

echo "🚀 Building Grok Chat frontend..."

# Install dependencies (skip if already installed)
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm ci --production=false
else
  echo "✓ Dependencies already installed"
fi

# Build for production
echo "🔨 Building application..."
npm run build

echo "✅ Build complete!"
echo "📂 Output directory: dist/grok-chat/browser"
