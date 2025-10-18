# Multi-Platform Deployment Guide

This app can be deployed to **both DigitalOcean and Vercel**. Choose based on your needs:

## 🌊 DigitalOcean vs ⚡ Vercel - Quick Comparison

| Feature | DigitalOcean App Platform | Vercel |
|---------|--------------------------|--------|
| **Ease of Setup** | Medium | Very Easy |
| **Pricing** | Predictable ($5-15/mo) | Free tier, then usage-based |
| **Database** | ✅ Managed PostgreSQL | ✅ Vercel Postgres (add-on) |
| **Best For** | Full control, databases | Static sites, serverless |
| **CLI Tool** | `doctl` | `vercel` |
| **Build Time** | ~5-10 min | ~2-5 min |
| **Auto-Deploy** | ✅ Git push | ✅ Git push |

---

## Option 1: DigitalOcean App Platform (Recommended for Full Stack + Database)

### Why Choose DigitalOcean?
- ✅ **Managed PostgreSQL database** included in config
- ✅ **Predictable pricing** - no surprises
- ✅ **Full backend control** - not serverless
- ✅ **Great for learning** infrastructure concepts
- ✅ **Can scale** to more complex setups

### Prerequisites
```bash
# Install DigitalOcean CLI
brew install doctl  # macOS
# or
snap install doctl  # Linux

# Authenticate
doctl auth init
# Enter your API token from: https://cloud.digitalocean.com/account/api/tokens
```

### Deploy to DigitalOcean

#### Method 1: Using the CLI (Automated)
```bash
# Make the script executable
chmod +x .do/deploy.sh

# Run the deployment
./.do/deploy.sh
```

#### Method 2: Using the Dashboard (Manual)
1. Go to https://cloud.digitalocean.com/apps
2. Click **"Create App"**
3. Select **GitHub** and authorize
4. Choose repository: `Phazzie/grokisanaughtypuppy`
5. Click **"Use Spec"** and upload `.do/app.yaml`
6. Set environment variable: `XAI_API_KEY`
7. Click **"Create Resources"**

#### Method 3: Using doctl Command Directly
```bash
# Create app from spec
doctl apps create --spec .do/app.yaml

# List apps to get ID
doctl apps list

# Update app (if needed)
doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

### Add PostgreSQL Database

#### Option A: Included in app.yaml
The `.do/app.yaml` file already includes a database configuration. Just uncomment the `databases` section:

```yaml
databases:
  - name: db
    engine: PG
    version: "14"
    production: false  # Change to true for production ($15/mo)
    cluster_name: grok-chat-db
    db_name: grok_chat
    db_user: grok_user
```

#### Option B: Create Database Separately
```bash
# Make the script executable
chmod +x .do/database-setup.sh

# Run the database setup
./.do/database-setup.sh
```

Or manually:
```bash
# Create database cluster
doctl databases create grok-chat-db \
  --engine pg \
  --version 14 \
  --size db-s-1vcpu-1gb \
  --region nyc3 \
  --num-nodes 1

# Get database ID
doctl databases list

# Create database and user
doctl databases db create YOUR_DB_ID grok_chat
doctl databases user create YOUR_DB_ID grok_user

# Get connection string
doctl databases connection YOUR_DB_ID
```

Then add `DATABASE_URL` to your app's environment variables.

### DigitalOcean Pricing
- **Backend**: $5/month (basic-xxs)
- **Frontend**: Free (static site)
- **Database**: $15/month (1GB RAM, 10GB storage)
- **Total**: ~$20/month for full stack with database

### Managing Your DigitalOcean App

```bash
# List all apps
doctl apps list

# Get app details
doctl apps get YOUR_APP_ID

# View logs
doctl apps logs YOUR_APP_ID --type=run --follow

# View deployments
doctl apps list-deployments YOUR_APP_ID

# Create a new deployment
doctl apps create-deployment YOUR_APP_ID

# Delete app
doctl apps delete YOUR_APP_ID
```

---

## Option 2: Vercel (Recommended for Quick Deploy)

### Why Choose Vercel?
- ✅ **Fastest deployment** - literally 2 minutes
- ✅ **Excellent DX** - amazing developer experience
- ✅ **Free tier** - generous limits
- ✅ **Auto-scaling** - handles traffic spikes
- ✅ **Global CDN** - fast worldwide

### Prerequisites
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login
```

### Deploy to Vercel

#### Method 1: One-Command Deploy (Easiest)
```bash
# From project root
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? grok-chat
# - Directory? ./
```

This will deploy both frontend and backend automatically!

#### Method 2: Separate Deployments

**Deploy Backend:**
```bash
cd backend
vercel --prod

# Set environment variable in Vercel dashboard
# XAI_API_KEY = your_api_key
```

**Deploy Frontend:**
```bash
cd grok-chat

# Update environment.prod.ts with backend URL first
# Then deploy:
npm run build -- --configuration production
vercel --prod
```

#### Method 3: GitHub Integration (Auto-Deploy)
1. Go to https://vercel.com/new
2. Import `Phazzie/grokisanaughtypuppy`
3. Configure project:
   - **Framework**: Other
   - **Root Directory**: Leave as `./`
   - **Build Command**: `cd backend && npm install` (for backend)
   - **Output Directory**: `backend`
4. Add environment variable: `XAI_API_KEY`
5. Deploy!

Now every push to `main` auto-deploys!

### Add Database to Vercel

Vercel offers **Vercel Postgres** (powered by Neon):

```bash
# In your Vercel project dashboard
# Go to Storage → Create Database → Postgres

# Or via CLI:
vercel env add DATABASE_URL
# Paste your Postgres connection string
```

Or use an external database:
- **Neon** (free tier): https://neon.tech
- **Supabase** (free tier): https://supabase.com
- **Railway** (free trial): https://railway.app
- **ElephantSQL** (free tier): https://elephantsql.com

### Vercel Pricing
- **Hobby (Free)**:
  - 100GB bandwidth
  - Serverless functions
  - Unlimited sites
- **Pro ($20/month)**:
  - 1TB bandwidth
  - Advanced analytics
  - Team collaboration

---

## Using the Database Layer

Once you have a database (DigitalOcean or external), update your backend:

### 1. Install PostgreSQL client
```bash
cd backend
npm install pg
```

### 2. Set DATABASE_URL environment variable
```bash
# Format:
# postgresql://user:password@host:port/database?sslmode=require

# Example:
DATABASE_URL=postgresql://grok_user:password@db.example.com:25060/grok_chat?sslmode=require
```

### 3. Update server.js
The `backend/db.js` module is already created! Just require it:

```javascript
const db = require('./db');

// Initialize database on startup
(async () => {
  if (process.env.DATABASE_URL) {
    try {
      await db.createTables();
      console.log('✅ Database initialized');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
    }
  } else {
    console.log('⚠️  No DATABASE_URL - running without persistence');
  }
})();
```

### 4. Add API endpoints for persistence
```javascript
// Save conversation
app.post('/api/conversations', async (req, res) => {
  try {
    const { userId, name, systemPrompt, messages } = req.body;
    const id = await db.saveConversation(userId, name, systemPrompt, messages);
    res.json({ id, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Load conversation
app.get('/api/conversations/:id', async (req, res) => {
  try {
    const conversation = await db.loadConversation(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List conversations
app.get('/api/conversations', async (req, res) => {
  try {
    const userId = req.query.userId || 'anonymous';
    const conversations = await db.listConversations(userId);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Deployment Comparison Matrix

| Aspect | DigitalOcean | Vercel |
|--------|--------------|--------|
| **Setup Time** | 10-15 min | 2-5 min |
| **Configuration** | YAML file | Auto-detect or JSON |
| **Database Integration** | ✅ Built-in | 🔌 Add-on or external |
| **Logs Access** | CLI + Dashboard | CLI + Dashboard |
| **Custom Domains** | ✅ Free | ✅ Free |
| **SSL** | ✅ Auto | ✅ Auto |
| **Git Integration** | ✅ Yes | ✅ Yes |
| **Preview Deploys** | ✅ Yes | ✅ Yes (every PR) |
| **Rollback** | ✅ Yes | ✅ Yes |
| **Environment Variables** | Dashboard + CLI | Dashboard + CLI |
| **Monitoring** | Basic included | Analytics in Pro |
| **Support** | Ticket system | Community + Pro support |

---

## Which Should You Choose?

### Choose DigitalOcean if:
- ✅ You want to learn infrastructure concepts
- ✅ You need a managed database included
- ✅ You prefer predictable monthly pricing
- ✅ You want full control over the backend
- ✅ You plan to add more microservices later

### Choose Vercel if:
- ✅ You want the absolute fastest setup
- ✅ You're okay with serverless architecture
- ✅ You want the best DX (developer experience)
- ✅ You're fine with usage-based pricing
- ✅ You want global CDN and auto-scaling

### Use Both if:
- ✅ You want to compare performance
- ✅ You're building a portfolio (show versatility)
- ✅ You want a backup deployment
- ✅ You want to experiment with different architectures

---

## Quick Start Commands

### DigitalOcean
```bash
# Install CLI
brew install doctl

# Auth and deploy
doctl auth init
./.do/deploy.sh

# Add database
./.do/database-setup.sh
```

### Vercel
```bash
# Install CLI
npm i -g vercel

# Deploy
vercel

# Done! 🎉
```

---

## Post-Deployment Checklist

Both platforms:
- [ ] Set `XAI_API_KEY` environment variable
- [ ] Configure custom domain (optional)
- [ ] Set up SSL (usually automatic)
- [ ] Test all features in production
- [ ] Monitor logs for errors
- [ ] Set up alerts/monitoring
- [ ] Configure CORS properly
- [ ] Add rate limiting
- [ ] Test on mobile devices
- [ ] Share with friends! 🎉

---

## Getting Help

### DigitalOcean
- **Docs**: https://docs.digitalocean.com/products/app-platform/
- **Community**: https://www.digitalocean.com/community
- **Support**: Open a ticket in dashboard

### Vercel
- **Docs**: https://vercel.com/docs
- **Community**: https://github.com/vercel/vercel/discussions
- **Support**: support@vercel.com

---

## Cost Calculator

### Minimal Setup (Free Tier)
- **Vercel**: $0/month (Hobby plan)
- **External DB** (Neon free tier): $0/month
- **Total**: **FREE** 🎉

### Production Setup
- **DigitalOcean**: $20/month (app + database)
- Or **Vercel**: $0-20/month (depends on traffic)
- Or **Both**: $20-40/month (redundancy!)

---

**Ready to deploy?** Pick a platform and run the commands above! 🚀
