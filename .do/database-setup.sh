#!/bin/bash

# DigitalOcean Database Setup Script
# Creates a PostgreSQL database for conversation persistence

set -e

echo "🗄️  DigitalOcean Database Setup"
echo "==============================="

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ doctl is not installed"
    exit 1
fi

# Configuration
DB_NAME="grok-chat-db"
DB_ENGINE="pg"
DB_VERSION="14"
DB_SIZE="db-s-1vcpu-1gb"  # $15/month - adjust as needed
DB_REGION="nyc3"
DB_NUM_NODES="1"

echo "📋 Database Configuration:"
echo "   Name: $DB_NAME"
echo "   Engine: PostgreSQL $DB_VERSION"
echo "   Size: $DB_SIZE"
echo "   Region: $DB_REGION"
echo ""

read -p "❓ Create this database? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

# Create database
echo "🔨 Creating database cluster..."
doctl databases create $DB_NAME \
    --engine $DB_ENGINE \
    --version $DB_VERSION \
    --size $DB_SIZE \
    --region $DB_REGION \
    --num-nodes $DB_NUM_NODES

# Get database ID
DB_ID=$(doctl databases list --format ID,Name --no-header | grep "$DB_NAME" | awk '{print $1}')

echo "✅ Database cluster created! ID: $DB_ID"
echo ""
echo "⏳ Waiting for database to be ready (this may take a few minutes)..."

# Wait for database to be ready
while true; do
    STATUS=$(doctl databases get $DB_ID --format Status --no-header)
    if [ "$STATUS" = "online" ]; then
        break
    fi
    echo "   Status: $STATUS (waiting...)"
    sleep 10
done

echo "✅ Database is online!"
echo ""

# Create database and user
echo "🔨 Creating database and user..."
doctl databases db create $DB_ID grok_chat
doctl databases user create $DB_ID grok_user

# Get connection info
echo ""
echo "📋 Database Connection Information:"
doctl databases get $DB_ID

echo ""
echo "🔗 Connection string will be available in your app as DATABASE_URL"
echo "   when you link the database to your app in the DigitalOcean dashboard"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://cloud.digitalocean.com/databases"
echo "2. Click on '$DB_NAME'"
echo "3. Copy the connection string"
echo "4. Add it to your app's environment variables as DATABASE_URL"
echo ""
echo "💡 Or link it automatically by updating .do/app.yaml with the database component"
