# API Versioning Migration Guide

## Overview

The Grok Chat API now supports versioning to enable future evolution while maintaining backward compatibility. All endpoints are now available under `/api/v1/`.

## Current Version: v1.0.0

**Status**: Stable
**Release Date**: 2025-11-04

## What Changed

### New Versioned Endpoints

All API endpoints now have versioned paths:

| Old Path | New Path | Status |
|----------|----------|--------|
| `/api/chat` | `/api/v1/chat` | ✅ Both work |
| `/api/evaluate` | `/api/v1/evaluate` | ✅ Both work |
| `/api/upload` | `/api/v1/upload` | ✅ Both work |
| `/api/health` | `/api/v1/health` | ✅ Both work |
| `/api/conversations` | `/api/v1/conversations` | ✅ Both work |
| `/api/conversations/:id` | `/api/v1/conversations/:id` | ✅ Both work |
| `/api/imports` | `/api/v1/imports` | ✅ Both work |
| `/api/imports/:id` | `/api/v1/imports/:id` | ✅ Both work |
| `/api/topics` | `/api/v1/topics` | ✅ Both work |
| `/api/topics/:id/conversations` | `/api/v1/topics/:id/conversations` | ✅ Both work |

### New Features

1. **Version Headers**: All responses include:
   - `X-API-Version`: Current version being used
   - `X-Supported-Versions`: List of supported versions

2. **API Discovery Endpoint**:
   ```
   GET /api/v1
   ```
   Returns information about available endpoints and their documentation.

3. **Backward Compatibility**: Old `/api/*` paths continue to work and are automatically redirected to `/api/v1/*`.

## Migration Steps

### Recommended Migration (Gradual)

1. **No immediate action required** - All existing code continues to work
2. **Update over time** - Gradually update your API calls to use `/api/v1/` prefix
3. **Test thoroughly** - Verify your application works with the new paths
4. **Monitor headers** - Check response headers for version information

### Example: Updating Frontend Code

**Before:**
```typescript
// Old approach (still works)
this.http.post('/api/chat', { messages, systemPrompt, temperature })
```

**After:**
```typescript
// New approach (recommended)
this.http.post('/api/v1/chat', { messages, systemPrompt, temperature })
```

### Checking API Version

You can check which version you're using:

```typescript
// Check response headers
this.http.post('/api/v1/chat', data).subscribe(response => {
  const version = response.headers.get('X-API-Version');
  console.log('Using API version:', version);
});
```

### Discovery Endpoint

Get information about available endpoints:

```bash
curl http://localhost:3000/api/v1
```

Response:
```json
{
  "version": "1.0.0",
  "status": "stable",
  "endpoints": [
    {
      "method": "POST",
      "path": "/api/v1/chat",
      "description": "Send chat messages to Grok"
    },
    // ... more endpoints
  ],
  "documentation": "/api/v1/docs"
}
```

## Breaking Changes

### v1.0.0 (Current)
- **None** - This is the first versioned release
- All existing functionality remains the same
- Old paths (`/api/*`) continue to work

## Future Plans

### v2.0.0 (Planned)
When v2 is released:
- v1 will continue to work
- New features will be available in v2
- Deprecation notices will be provided well in advance
- Migration guides will be provided for breaking changes

## Best Practices

1. **Always specify version** in production code: Use `/api/v1/` instead of `/api/`
2. **Monitor deprecation notices** in response headers
3. **Test against specific versions** to avoid surprises
4. **Read changelog** before upgrading versions
5. **Use version headers** for debugging and monitoring

## Version Support Policy

- **Current version (v1)**: Fully supported, maintained, and updated
- **Previous versions**: Supported for 6 months after new major version release
- **Deprecated versions**: Will receive security fixes only

## Testing Version Support

### Test Versioned Endpoint
```bash
# Test v1 endpoint
curl -X POST http://localhost:3000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

### Test Backward Compatibility
```bash
# Test old endpoint (should redirect to v1)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

### Check Version Headers
```bash
curl -I http://localhost:3000/api/v1/health
# Look for: X-API-Version and X-Supported-Versions headers
```

## Rollout Timeline

- **Phase 1** (Current): v1 endpoints available, old endpoints redirected
- **Phase 2** (Month 1-3): Gradual migration of frontend to v1 paths
- **Phase 3** (Month 3-6): Monitor usage of old paths
- **Phase 4** (Month 6+): Old paths may show deprecation warnings
- **Phase 5** (v2 release): v2 available, v1 remains supported

## Need Help?

- **API Documentation**: `/api/v1/docs` (coming soon)
- **GitHub Issues**: Report problems or ask questions
- **Changelog**: See `CHANGELOG.md` for detailed version history

## Changelog

### v1.0.0 (2025-11-04)
**Initial versioned release**

- ✅ Added `/api/v1/` prefix to all endpoints
- ✅ Maintained backward compatibility with `/api/*` paths
- ✅ Added version headers to responses
- ✅ Added API discovery endpoint
- ✅ No breaking changes

---

**Last Updated**: 2025-11-04
**Current API Version**: v1.0.0
