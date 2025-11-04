# Environment Setup Guide for DigitalOcean

## Required Environment Variables

Add these environment variables in your DigitalOcean App Platform settings:

### Backend Service

1. **XAI_API_KEY** (REQUIRED)
   - Get your API key from: https://console.x.ai/
   - Value: `xai-xxxxxxxxxxxxxxxxxxxxxxxxxx`
   - This is required for all AI features to work

2. **DATABASE_URL** (REQUIRED for conversation upload feature)
   - Format: `postgresql://username:password@host:port/database`
   - Example: `postgresql://grok_user:your_password@db-postgresql-nyc1-12345.ondigitalocean.com:25060/grok_chat?sslmode=require`
   - Get this from your DigitalOcean Managed Database

3. **NODE_ENV**
   - Value: `production`

4. **PORT** (Optional)
   - Value: `3000` (default)

5. **ALLOWED_ORIGINS** (Optional)
   - Your frontend URL(s), comma-separated
   - Example: `https://your-app.ondigitalocean.app`

### Frontend Service

The frontend should be configured to point to your backend:
- Update `grok-chat/src/environments/environment.prod.ts` with your backend URL

## Database Setup

### Option 1: DigitalOcean Managed Database (Recommended)

1. Create a PostgreSQL database in DigitalOcean
2. Copy the connection string
3. Add it as `DATABASE_URL` environment variable in your backend service
4. The database will be automatically initialized on first backend startup

### Option 2: Docker Compose (Local Development)

1. Copy `.env.example` to `.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Edit `.env` and set your values:
   ```
   XAI_API_KEY=your_xai_api_key_here
   DATABASE_URL=postgresql://grok_user:change_me_in_production@db:5432/grok_chat
   ```

3. Start services:
   ```bash
   docker-compose up -d
   ```

## Testing Your Setup

Once deployed, test your API connection:

1. Go to your deployed frontend URL
2. Look at the header - you should see a green "Connected" indicator
3. Click the **"🎭 Test API"** button
4. If working correctly, you'll see a PG-13 joke appear
5. If it fails, check:
   - XAI_API_KEY is set correctly in backend environment
   - Backend service is running
   - CORS origins include your frontend URL

## Features That Require Database

These features need `DATABASE_URL` to be configured:

- ✅ **Conversation Upload** - Upload ChatGPT conversations.json files
- ✅ **Topic Categorization** - Browse conversations by AI-generated topics
- ✅ **Conversation Analysis** - Get insights, sentiment, and patterns
- ✅ **Import History** - Track upload progress and history

Without a database, the basic chat functionality will still work, but conversation library features won't be available.

## Troubleshooting

### "Not Connected" or Red Indicator

**Problem**: API key not configured or backend not accessible

**Solutions**:
1. Check that `XAI_API_KEY` is set in backend environment variables
2. Verify backend service is running (check DigitalOcean logs)
3. Check CORS settings if frontend and backend are on different domains

### "API test failed"

**Problem**: Backend can't communicate with X.AI API

**Solutions**:
1. Verify your API key is valid at https://console.x.ai/
2. Check backend logs for specific error messages
3. Ensure backend has internet access

### Upload feature fails

**Problem**: Database not connected

**Solutions**:
1. Verify `DATABASE_URL` is set in backend environment
2. Check database connection string format
3. Ensure database allows connections from your backend IP
4. Check database logs for connection errors

### Build errors on DigitalOcean

**Problem**: TypeScript or Sass compilation errors

**Solutions**:
- These should be fixed in the latest commit
- If issues persist, check build logs for specific errors
- Ensure all dependencies are installed: `npm install`

## Security Notes

- **Never commit .env files** to git
- **Keep API keys secret** - don't expose them in frontend code
- **Use strong database passwords** in production
- **Enable SSL** for database connections in production
- **Review CORS settings** to only allow your frontend domain

## Getting Your X.AI API Key

1. Go to https://console.x.ai/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (it starts with `xai-`)
6. Add it to your backend environment variables

**Cost**: Check current pricing at https://x.ai/pricing
