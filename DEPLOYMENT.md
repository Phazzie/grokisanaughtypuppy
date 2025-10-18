# Deployment Guide

## Current Status: 🟡 NEEDS CONFIGURATION

The application is **functionally complete** but requires deployment configuration before going live.

## Pre-Deployment Checklist

### Backend Configuration
- [ ] Create production environment variables
- [ ] Update CORS to restrict origins
- [ ] Add rate limiting middleware
- [ ] Set up error logging/monitoring
- [ ] Configure health check endpoint
- [ ] Test with production API keys

### Frontend Configuration
- [ ] Update `environment.prod.ts` with production backend URL
- [ ] Build production bundle (`ng build --configuration production`)
- [ ] Test production build locally
- [ ] Optimize bundle size
- [ ] Verify all assets load correctly

### Security
- [ ] Ensure API keys are in environment variables only
- [ ] Configure HTTPS/SSL
- [ ] Set up proper CORS origins
- [ ] Implement request size limits
- [ ] Add input validation on all endpoints
- [ ] Set security headers

### Testing
- [ ] Test all features in production-like environment
- [ ] Test on multiple devices/browsers
- [ ] Test error scenarios
- [ ] Verify mobile responsiveness
- [ ] Check accessibility (WCAG compliance)

## Deployment Options

### Option 1: Vercel (Recommended - Easiest)

#### Frontend Deployment
```bash
cd grok-chat
npm install -g vercel
vercel login
vercel --prod
```

**Environment Variables to Set:**
- None required (API URL configured in build)

#### Backend Deployment
```bash
cd backend
vercel login
vercel --prod
```

**Environment Variables to Set in Vercel Dashboard:**
- `XAI_API_KEY` - Your X.AI API key
- `NODE_ENV` - `production`
- `ALLOWED_ORIGINS` - Your frontend URL (e.g., `https://grok-chat.vercel.app`)

**After Backend Deploy:**
1. Copy the backend URL from Vercel
2. Update `grok-chat/src/environments/environment.prod.ts` with the backend URL
3. Redeploy frontend

### Option 2: Netlify (Frontend) + Railway (Backend)

#### Frontend (Netlify)
```bash
cd grok-chat
npm run build -- --configuration production
# Upload dist/grok-chat/browser/ to Netlify
```

Or connect GitHub repo to Netlify:
- Build command: `cd grok-chat && npm run build -- --configuration production`
- Publish directory: `grok-chat/dist/grok-chat/browser`

#### Backend (Railway)
1. Connect GitHub repo to Railway
2. Set root directory to `backend`
3. Add environment variables:
   - `XAI_API_KEY`
   - `NODE_ENV=production`
   - `ALLOWED_ORIGINS` (your Netlify URL)

### Option 3: Docker + Cloud Provider

#### Create Dockerfiles

**Backend Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

**Frontend Dockerfile:**
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

FROM nginx:alpine
COPY --from=build /app/dist/grok-chat/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Deploy to:
- AWS ECS/EKS
- Google Cloud Run
- Azure Container Apps
- DigitalOcean App Platform

## Required Environment Variables

### Backend (`backend/.env`)
```bash
# Required
XAI_API_KEY=xai-xxxxxxxxxxxxxxxxxxxxxxxx

# Optional
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend-url.com,https://another-domain.com
```

### Frontend
Update `grok-chat/src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend-url.com/api'
};
```

## Post-Deployment Steps

### 1. Update Backend CORS
Edit `backend/server.js`:
```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : [];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy violation'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
```

### 2. Add Rate Limiting
```bash
cd backend
npm install express-rate-limit
```

Update `server.js`:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 3. Add Request Size Limits
Update `server.js`:
```javascript
app.use(express.json({ limit: '10mb' }));
```

### 4. Set Up Monitoring
Consider adding:
- **Error tracking**: Sentry, Rollbar
- **Analytics**: Google Analytics, Plausible
- **Uptime monitoring**: UptimeRobot, Pingdom
- **Logging**: LogRocket, Datadog

### 5. Configure CI/CD
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        run: |
          cd backend
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          XAI_API_KEY: ${{ secrets.XAI_API_KEY }}

  deploy-frontend:
    needs: deploy-backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and Deploy
        run: |
          cd grok-chat
          npm ci
          npm run build -- --configuration production
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## Testing Production Build Locally

### Backend
```bash
cd backend
export XAI_API_KEY=your_api_key_here
export NODE_ENV=production
export PORT=3000
npm start
```

### Frontend
```bash
cd grok-chat
npm run build -- --configuration production
npx http-server dist/grok-chat/browser -p 4200
```

Then test at `http://localhost:4200`

## Performance Optimization

### Frontend
- ✅ Lazy load routes (if app grows)
- ✅ Use OnPush change detection
- ✅ Optimize images (compress, use WebP)
- ✅ Enable Angular production mode
- ✅ Tree-shake unused code
- ✅ Minify and compress assets

### Backend
- ✅ Enable gzip compression
- ✅ Cache API responses (if applicable)
- ✅ Use connection pooling
- ✅ Implement request queueing for high load
- ✅ Add CDN for static assets

## Monitoring & Maintenance

### What to Monitor
- API response times
- Error rates
- API usage/costs
- Server uptime
- User engagement metrics

### Regular Maintenance
- Update dependencies monthly
- Review security advisories
- Monitor API quota/usage
- Back up saved conversations (if implementing server-side storage)
- Review and optimize performance

## Cost Estimates

### Free Tier Options
- **Vercel**: Free tier includes 100GB bandwidth, serverless functions
- **Netlify**: Free tier includes 100GB bandwidth
- **Railway**: $5 credit/month on free tier
- **Render**: Free tier available with limitations

### Paid Tier (if needed)
- **Vercel Pro**: $20/month
- **Railway**: Pay-as-you-go (~$10-20/month for this app)
- **Render**: ~$7/month for backend

### X.AI API Costs
- Check current pricing at https://x.ai/api
- Implement rate limiting to control costs
- Monitor usage in X.AI dashboard

## Troubleshooting Common Issues

### "CORS Error" in Production
- Check `ALLOWED_ORIGINS` environment variable
- Verify frontend URL matches exactly (no trailing slash differences)
- Check browser console for actual origin being sent

### "API Key Not Configured" Error
- Verify `XAI_API_KEY` is set in backend environment variables
- Check environment variable name is exact (case-sensitive)
- Restart backend server after setting variables

### Frontend Can't Connect to Backend
- Verify `environment.prod.ts` has correct backend URL
- Check backend is actually running and accessible
- Verify HTTPS if frontend is HTTPS (no mixed content)
- Check firewall/security group settings

### Build Failures
- Clear `node_modules` and `package-lock.json`, reinstall
- Check Node.js version compatibility
- Verify all dependencies are in `package.json`
- Check for TypeScript errors

## Next Steps After Deployment

1. **Custom Domain** (optional)
   - Purchase domain from Namecheap, Google Domains, etc.
   - Configure DNS settings in Vercel/Netlify
   - Enable SSL/TLS (usually automatic)

2. **Analytics** (recommended)
   - Add Google Analytics or Plausible
   - Track user engagement and feature usage
   - Monitor performance metrics

3. **User Feedback**
   - Add feedback mechanism
   - Monitor user issues
   - Iterate based on feedback

4. **Additional Features**
   - User authentication
   - Cloud-based conversation storage
   - Sharing conversations
   - Multiple AI model support
   - Voice input/output

## Support & Resources

- **Angular Deployment**: https://angular.io/guide/deployment
- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **X.AI API**: https://docs.x.ai

---

**Status Legend:**
- 🟢 Ready to Deploy
- 🟡 Needs Configuration
- 🔴 Blockers Present

**Current**: 🟡 Update environment variables and CORS configuration, then you're ready to deploy!
