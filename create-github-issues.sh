#!/bin/bash

# Script to create GitHub issues from the analysis
# Requires: gh CLI (GitHub CLI) to be installed and authenticated
# Usage: ./create-github-issues.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}GitHub Issues Bulk Creator${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed.${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✓ GitHub CLI is installed and authenticated${NC}"
echo ""

# Ask for confirmation
echo -e "${YELLOW}This will create 30 GitHub issues in the current repository.${NC}"
echo -e "${YELLOW}Do you want to continue? (y/n)${NC}"
read -r confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${BLUE}Creating issues...${NC}"
echo ""

# Counter
created=0
failed=0

# Issue 1: No Authentication/Authorization System
echo -e "${BLUE}[1/30]${NC} Creating: No Authentication/Authorization System"
gh issue create \
  --title "🔴 No Authentication/Authorization System" \
  --label "security,critical,authentication" \
  --body "**Priority:** 🔴 Critical
**Estimated Effort:** 3-5 days

## Description
The application has no authentication or authorization system. All API endpoints are publicly accessible without credentials, and user identification relies on client-provided \`userId\` parameters.

## Impact
- Any user can access/modify data of any other user
- No audit trail for user actions
- Data privacy violations
- GDPR/compliance issues
- OWASP A01:2021 - Broken Access Control violation

## Affected Files
- \`/backend/server.js:371\` - Upload endpoint accepts userId from request body
- \`/backend/server.js:423\` - Import status uses userId from query parameter
- \`/backend/server.js:438\` - List imports uses userId from query parameter
- \`/backend/server.js:480\` - List conversations uses userId from query parameter
- \`/grok-chat/src/app/services/chat.service.ts:148-181\` - Client controls userId

## Recommendation
- Implement JWT or session-based authentication
- Add authentication middleware to all protected routes
- Verify userId matches authenticated user
- Implement role-based access control (RBAC)" && ((created++)) || ((failed++))

# Issue 2: CSRF Protection Disabled
echo -e "${BLUE}[2/30]${NC} Creating: CSRF Protection Disabled"
gh issue create \
  --title "🔴 CSRF Protection Disabled" \
  --label "security,critical,csrf" \
  --body "**Priority:** 🔴 Critical
**Estimated Effort:** 1-2 days

## Description
CSRF (Cross-Site Request Forgery) protection is explicitly disabled throughout the application. All state-changing operations are vulnerable to CSRF attacks.

## Impact
- Attackers can perform actions on behalf of authenticated users
- File uploads, data modifications vulnerable
- State-changing operations can be triggered from malicious sites

## Affected Files
- \`/backend/middleware/security.js:20-39\` - CSRF validation function is disabled

## Code Example
\`\`\`javascript
function validateCSRFToken(req, res, next) {
  // TODO: Implement session-based CSRF protection
  // For now, rely on CORS and other security measures
  return next();  // ⚠️ CSRF disabled
}
\`\`\`

## Recommendation
- Implement CSRF tokens with session management
- Use SameSite cookie attribute
- Consider double-submit cookie pattern" && ((created++)) || ((failed++))

# Issue 3: CORS Allows No-Origin Requests
echo -e "${BLUE}[3/30]${NC} Creating: CORS Allows Requests with No Origin"
gh issue create \
  --title "🔴 CORS Allows Requests with No Origin" \
  --label "security,critical,cors" \
  --body "**Priority:** 🔴 Critical
**Estimated Effort:** 0.5 days

## Description
The CORS configuration allows requests without an Origin header, which can be exploited to bypass CORS protection.

## Impact
- CORS protection can be bypassed by attackers
- Requests from non-browser clients bypass security
- Credentials are enabled, increasing risk

## Affected Files
- \`/backend/server.js:102-112\` - CORS configuration

## Recommendation
Only allow no-origin requests in development:
\`\`\`javascript
if (!origin && process.env.NODE_ENV !== 'production') {
  return callback(null, true);
}
if (!origin || allowedOrigins.indexOf(origin) === -1) {
  return callback(new Error('Not allowed by CORS'), false);
}
\`\`\`" && ((created++)) || ((failed++))

# Issue 4: SSL Certificate Validation Disabled
echo -e "${BLUE}[4/30]${NC} Creating: SSL Certificate Validation Disabled in Production"
gh issue create \
  --title "🔴 SSL Certificate Validation Disabled in Production" \
  --label "security,critical,database,ssl" \
  --body "**Priority:** 🔴 Critical
**Estimated Effort:** 0.5 days

## Description
Database SSL certificate validation is disabled in production (\`rejectUnauthorized: false\`), making the connection vulnerable to MITM attacks.

## Impact
- Vulnerable to man-in-the-middle attacks
- Database credentials could be intercepted
- Data transmitted to/from database is not secure

## Affected Files
- \`/backend/db.js:20-22\` - Database SSL configuration

## Recommendation
\`\`\`javascript
ssl: process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: true, ca: process.env.DB_CA_CERT }
  : false
\`\`\`" && ((created++)) || ((failed++))

# Issue 5: Database Schema Conflict
echo -e "${BLUE}[5/30]${NC} Creating: Database Schema Conflict - UUID vs SERIAL"
gh issue create \
  --title "🔴 Database Schema Conflict - UUID vs SERIAL" \
  --label "database,critical,bug,breaking" \
  --body "**Priority:** 🔴 Critical
**Estimated Effort:** 2-3 days

## Description
Critical schema inconsistency: \`init.sql\` defines conversations table with UUID primary keys, but \`db.js\` creates with SERIAL (integer) primary keys.

## Impact
- Application may fail to start or work correctly
- Data corruption risk
- Breaking change for existing deployments

## Affected Files
- \`/backend/init.sql:5-12\` - Uses UUID
- \`/backend/db.js:104-111\` - Uses SERIAL

## Recommendation
1. Decide on UUID or SERIAL (recommend SERIAL for simplicity)
2. Create migration \`002_reconcile_schema_differences.sql\`
3. Update all references consistently
4. Add schema validation tests" && ((created++)) || ((failed++))

# Issue 6: Insecure Default Database Credentials
echo -e "${BLUE}[6/30]${NC} Creating: Insecure Default Database Credentials"
gh issue create \
  --title "🔴 Insecure Default Database Credentials" \
  --label "security,critical,configuration" \
  --body "**Priority:** 🔴 Critical
**Estimated Effort:** 0.5 days

## Description
Docker Compose files contain insecure default database passwords that could be accidentally used in production.

## Affected Files
- \`/docker-compose.yml:11\` - Insecure default
- \`/docker-compose.dev.yml:10-11\` - Hardcoded credentials

## Recommendation
- Remove default password fallbacks
- Require explicit password configuration
- Fail deployment if insecure password detected in production" && ((created++)) || ((failed++))

# Issue 7: No File Upload Authentication
echo -e "${BLUE}[7/30]${NC} Creating: No File Upload Authentication"
gh issue create \
  --title "🔴 No File Upload Authentication" \
  --label "security,critical,file-upload" \
  --body "**Priority:** 🔴 Critical
**Estimated Effort:** 1 day

## Description
File upload endpoint has no authentication. Anyone can upload files.

## Impact
- Unauthorized file uploads
- Storage exhaustion attacks
- Malicious file uploads

## Affected Files
- \`/backend/server.js:365-417\` - Upload endpoint

## Recommendation
- Add authentication middleware (depends on #1)
- Implement virus scanning
- Add per-user rate limiting" && ((created++)) || ((failed++))

# Issue 8: API Versioning Middleware Non-Functional
echo -e "${BLUE}[8/30]${NC} Creating: API Versioning Middleware Non-Functional"
gh issue create \
  --title "🟠 API Versioning Middleware Non-Functional" \
  --label "api,bug,high-priority" \
  --body "**Priority:** 🟠 High
**Estimated Effort:** 0.5 days

## Description
API versioning middleware is placed AFTER routes (line 494), so it never executes during request handling.

## Affected Files
- \`/backend/server.js:494-506\` - Middleware after routes

## Recommendation
Move middleware to line 154 (before routes are defined)" && ((created++)) || ((failed++))

# Issue 9: N+1 Query in listConversations
echo -e "${BLUE}[9/30]${NC} Creating: N+1 Query in listConversations"
gh issue create \
  --title "🟠 N+1 Query in listConversations" \
  --label "performance,database,high-priority" \
  --body "**Priority:** 🟠 High
**Estimated Effort:** 1 day

## Description
The \`listConversations()\` function has a correlated subquery executing COUNT for EACH row (N+1 pattern).

## Impact
- Slow API response times
- Database load increases linearly
- Poor user experience

## Affected Files
- \`/backend/db.js:231-239\`

## Recommendation
Use LEFT JOIN with GROUP BY instead of subquery:
\`\`\`sql
SELECT c.id, c.name, COUNT(m.id) as message_count
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
WHERE c.user_id = \$1
GROUP BY c.id
\`\`\`

Add index: \`CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);\`" && ((created++)) || ((failed++))

# Issue 10: Missing Database Connection Pool Configuration
echo -e "${BLUE}[10/30]${NC} Creating: Missing Database Connection Pool Configuration"
gh issue create \
  --title "🟠 Missing Database Connection Pool Configuration" \
  --label "database,configuration,high-priority" \
  --body "**Priority:** 🟠 High
**Estimated Effort:** 0.5 days

## Description
Database connection pool uses default settings with no explicit configuration.

## Impact
- Connection exhaustion under load
- No connection timeout (defaults to 0 = infinite wait)
- Poor resource management

## Affected Files
- \`/backend/db.js:12-41\`

## Recommendation
Add explicit pool configuration with max, min, timeouts, etc." && ((created++)) || ((failed++))

# Issue 11: Missing Transaction Wrapper for Analysis Pipeline
echo -e "${BLUE}[11/30]${NC} Creating: Missing Transaction Wrapper for Analysis Pipeline"
gh issue create \
  --title "🟠 Missing Transaction Wrapper for Analysis Pipeline" \
  --label "database,bug,high-priority" \
  --body "**Priority:** 🟠 High
**Estimated Effort:** 1 day

## Description
Analysis pipeline performs multiple database operations without transaction wrapper. Failures leave partial data.

## Impact
- Data inconsistency
- Orphaned records
- Difficult error recovery

## Affected Files
- \`/backend/server.js:605-645\`

## Recommendation
Wrap entire pipeline in transaction with proper error handling" && ((created++)) || ((failed++))

# Issue 12: No Pagination Metadata
echo -e "${BLUE}[12/30]${NC} Creating: No Pagination Metadata in API Responses"
gh issue create \
  --title "🟠 No Pagination Metadata in API Responses" \
  --label "api,enhancement,high-priority" \
  --body "**Priority:** 🟠 High
**Estimated Effort:** 1-2 days

## Description
List endpoints return raw arrays with no pagination metadata. Clients cannot determine total count or if more results exist.

## Impact
- Poor user experience
- Impossible to build proper pagination UI
- No standardization

## Affected Files
- \`/backend/server.js:437-441\` - List imports
- \`/backend/server.js:479-486\` - List conversations

## Recommendation
Return pagination metadata:
\`\`\`json
{
  \"data\": [...],
  \"pagination\": {
    \"total\": 100,
    \"limit\": 50,
    \"offset\": 0,
    \"hasMore\": true
  }
}
\`\`\`" && ((created++)) || ((failed++))

# Issue 13: Inconsistent Error Response Formats
echo -e "${BLUE}[13/30]${NC} Creating: Inconsistent API Error Response Formats"
gh issue create \
  --title "🟠 Inconsistent API Error Response Formats" \
  --label "api,bug,high-priority" \
  --body "**Priority:** 🟠 High
**Estimated Effort:** 1-2 days

## Description
API uses three different error response formats, making client-side error handling difficult.

## Impact
- Client code needs to handle multiple formats
- Poor developer experience
- Inconsistent error handling

## Recommendation
Standardize on single error format across all endpoints" && ((created++)) || ((failed++))

# Issue 14: Zero Test Coverage for Core Modules
echo -e "${BLUE}[14/30]${NC} Creating: Zero Test Coverage for Core Modules"
gh issue create \
  --title "🟠 Zero Test Coverage for Core Modules" \
  --label "testing,high-priority" \
  --body "**Priority:** 🟠 High
**Estimated Effort:** 5-7 days

## Description
Core business logic has 0% test coverage. Database operations (677 lines), conversation parser (331 lines), and analysis service (401 lines) completely untested.

## Impact
- High risk of bugs in production
- Difficult to refactor safely
- No regression detection
- Current coverage ~15-20% but threshold is 70%

## Affected Files (0% Coverage)
- \`/backend/db.js\` - 677 lines
- \`/backend/conversationParser.js\` - 331 lines
- \`/backend/analysisService.js\` - 401 lines

## Recommendation
Create comprehensive test suites for all core modules
Target: 70% coverage minimum" && ((created++)) || ((failed++))

# Issue 15: Synchronous File Parsing Blocks Event Loop
echo -e "${BLUE}[15/30]${NC} Creating: Synchronous File Parsing Blocks Event Loop"
gh issue create \
  --title "🟠 Synchronous File Parsing Blocks Event Loop" \
  --label "performance,bug,high-priority" \
  --body "**Priority:** 🟠 High
**Estimated Effort:** 1 day

## Description
File upload uses synchronous \`JSON.parse()\` on large files, blocking Node.js event loop.

## Impact
- Server becomes unresponsive during uploads
- All other requests are blocked
- Potential DoS vector

## Affected Files
- \`/backend/server.js:375-383\`

## Recommendation
Use streaming JSON parser (stream-json) or worker threads" && ((created++)) || ((failed++))

# Issue 16: No Caching Strategy
echo -e "${BLUE}[16/30]${NC} Creating: No Caching Strategy for Frequently Accessed Data"
gh issue create \
  --title "🟠 No Caching Strategy for Frequently Accessed Data" \
  --label "performance,enhancement,high-priority" \
  --body "**Priority:** 🟠 High
**Estimated Effort:** 1-2 days

## Description
No caching for frequently accessed data like topics, import status. Every request hits database.

## Impact
- Unnecessary database load
- Slow response times
- Poor scalability

## Recommendation
Implement caching with node-cache or Redis for topics, imports, etc." && ((created++)) || ((failed++))

# Issue 17: Memory Leaks from Event Listeners
echo -e "${BLUE}[17/30]${NC} Creating: Memory Leaks from Uncleaned Event Listeners"
gh issue create \
  --title "🟡 Memory Leaks from Uncleaned Event Listeners" \
  --label "bug,memory-leak,frontend" \
  --body "**Priority:** 🟡 Medium
**Estimated Effort:** 1-2 days

## Description
Multiple event listeners added but never cleaned up in frontend, causing memory leaks.

## Impact
- Memory usage grows over time
- Performance degradation
- Potential crashes

## Affected Files
- \`/grok-chat/src/app/app.ts:85-95\`
- \`/grok-chat/src/app/services/accessibility.service.ts:26-32, 42-49\`
- \`/grok-chat/src/app/services/analytics.service.ts:173-201\`

## Recommendation
Implement proper cleanup in ngOnDestroy" && ((created++)) || ((failed++))

# Issue 18: Complex Functions Need Refactoring
echo -e "${BLUE}[18/30]${NC} Creating: Complex Functions Need Refactoring"
gh issue create \
  --title "🟡 Complex Functions Need Refactoring" \
  --label "code-quality,refactoring" \
  --body "**Priority:** 🟡 Medium
**Estimated Effort:** 2-3 days

## Description
Several functions are too long and complex (97+ lines), violating single responsibility principle.

## Affected Files
- \`/backend/server.js:582-678\` - 97 line function
- \`/backend/conversationParser.js:68-138\` - 71 lines
- \`/backend/db.js:435-472\` - Complex query building

## Recommendation
Extract smaller, focused functions" && ((created++)) || ((failed++))

# Issue 19: Magic Numbers Throughout Codebase
echo -e "${BLUE}[19/30]${NC} Creating: Magic Numbers Throughout Codebase"
gh issue create \
  --title "🟡 Magic Numbers Throughout Codebase" \
  --label "code-quality,refactoring" \
  --body "**Priority:** 🟡 Medium
**Estimated Effort:** 1-2 days

## Description
60+ instances of magic numbers with no context (3000, 10mb, 50, 5242880, etc.).

## Impact
- Difficult to understand purpose
- Hard to change configuration
- Error-prone

## Recommendation
Extract all magic numbers to named constants" && ((created++)) || ((failed++))

# Issue 20: Production Docker Configuration Issues
echo -e "${BLUE}[20/30]${NC} Creating: Production Docker Configuration Issues"
gh issue create \
  --title "🟡 Production Docker Configuration Issues" \
  --label "deployment,configuration" \
  --body "**Priority:** 🟡 Medium
**Estimated Effort:** 1 day

## Description
Backend Dockerfile uses development command (\`npm run dev\`) in production and lacks health checks.

## Affected Files
- \`/backend/Dockerfile\`

## Recommendation
- Change CMD to \`node server.js\`
- Add HEALTHCHECK
- Use multi-stage build
- Add production optimizations" && ((created++)) || ((failed++))

# Issue 21: Missing Environment Variables Documentation
echo -e "${BLUE}[21/30]${NC} Creating: Missing Environment Variables Documentation"
gh issue create \
  --title "🟡 Missing Environment Variables Documentation" \
  --label "documentation,configuration" \
  --body "**Priority:** 🟡 Medium
**Estimated Effort:** 1 day

## Description
\`.env.example\` missing 12+ critical environment variables used in codebase.

## Missing Variables
- SENTRY_DSN, LOG_LEVEL, DB_POOL_MAX, DB_POOL_MIN, etc.

## Recommendation
Create comprehensive .env.example with all variables and descriptions" && ((created++)) || ((failed++))

# Issue 22: Missing Database Indexes
echo -e "${BLUE}[22/30]${NC} Creating: Missing Database Indexes"
gh issue create \
  --title "🟡 Missing Database Indexes" \
  --label "database,performance" \
  --body "**Priority:** 🟡 Medium
**Estimated Effort:** 0.5 days

## Description
Critical database indexes missing for common query patterns.

## Missing Indexes
- messages.conversation_id
- messages.timestamp
- conversation_analyses.analyzed_at
- Composite indexes

## Recommendation
Create migration adding all necessary indexes" && ((created++)) || ((failed++))

# Issue 23: No Backend TypeScript
echo -e "${BLUE}[23/30]${NC} Creating: No Backend TypeScript"
gh issue create \
  --title "🟡 No Backend TypeScript" \
  --label "code-quality,enhancement" \
  --body "**Priority:** 🟡 Medium
**Estimated Effort:** 5-7 days

## Description
Entire backend is JavaScript with no type safety, leading to runtime errors.

## Recommendation
Gradually migrate backend to TypeScript" && ((created++)) || ((failed++))

# Issue 24: Incorrect HTTP Status Codes
echo -e "${BLUE}[24/30]${NC} Creating: Incorrect HTTP Status Codes"
gh issue create \
  --title "🟡 Incorrect HTTP Status Codes" \
  --label "api,bug" \
  --body "**Priority:** 🟡 Medium
**Estimated Effort:** 0.5 days

## Description
Upload endpoint returns 200 OK instead of 201 Created.

## Affected Files
- \`/backend/server.js:403\`

## Recommendation
Use 201 status code for all resource creation endpoints" && ((created++)) || ((failed++))

# Issue 25: Inconsistent Error Logging
echo -e "${BLUE}[25/30]${NC} Creating: Inconsistent Error Logging"
gh issue create \
  --title "🟡 Inconsistent Error Logging" \
  --label "logging,code-quality" \
  --body "**Priority:** 🟡 Medium
**Estimated Effort:** 1 day

## Description
Mixed usage of console.log, console.error, and proper logger throughout codebase.

## Recommendation
Replace all console.log/error with proper logger calls" && ((created++)) || ((failed++))

# Issue 26: Missing API Documentation (Swagger)
echo -e "${BLUE}[26/30]${NC} Creating: Missing API Documentation (Swagger)"
gh issue create \
  --title "🟢 Missing API Documentation (Swagger)" \
  --label "documentation,api" \
  --body "**Priority:** 🟢 Low
**Estimated Effort:** 2-3 days

## Description
Only 2 of 10 API endpoints have Swagger documentation.

## Missing Documentation
8 endpoints need @swagger JSDoc comments

## Recommendation
Add comprehensive Swagger documentation for all endpoints" && ((created++)) || ((failed++))

# Issue 27: No CONTRIBUTING.md
echo -e "${BLUE}[27/30]${NC} Creating: No CONTRIBUTING.md File"
gh issue create \
  --title "🟢 No CONTRIBUTING.md File" \
  --label "documentation" \
  --body "**Priority:** 🟢 Low
**Estimated Effort:** 1-2 days

## Description
Project has no contribution guidelines.

## Recommendation
Create CONTRIBUTING.md with:
- Code of Conduct
- Bug reporting process
- PR requirements
- Code style guide
- Testing requirements" && ((created++)) || ((failed++))

# Issue 28: No Architecture Documentation
echo -e "${BLUE}[28/30]${NC} Creating: No Architecture Documentation"
gh issue create \
  --title "🟢 No Architecture Documentation" \
  --label "documentation" \
  --body "**Priority:** 🟢 Low
**Estimated Effort:** 2-3 days

## Description
No dedicated architecture documentation. Information scattered across files.

## Recommendation
Create ARCHITECTURE.md with:
- System architecture diagram
- Database schema with ER diagram
- Request flow diagrams
- Component interaction diagrams" && ((created++)) || ((failed++))

# Issue 29: Frontend README Needs Project Info
echo -e "${BLUE}[29/30]${NC} Creating: Frontend README Contains Only Boilerplate"
gh issue create \
  --title "🟢 Frontend README Contains Only Boilerplate" \
  --label "documentation,frontend" \
  --body "**Priority:** 🟢 Low
**Estimated Effort:** 1 day

## Description
Frontend README only has Angular CLI boilerplate, no project-specific information.

## Recommendation
Replace with documentation covering:
- Component hierarchy
- State management
- Service architecture
- Build and deployment" && ((created++)) || ((failed++))

# Issue 30: No Troubleshooting Guide
echo -e "${BLUE}[30/30]${NC} Creating: No Troubleshooting Guide"
gh issue create \
  --title "🟢 No Troubleshooting Guide" \
  --label "documentation" \
  --body "**Priority:** 🟢 Low
**Estimated Effort:** 2-3 days

## Description
No dedicated troubleshooting documentation for common errors.

## Recommendation
Create TROUBLESHOOTING.md with:
- Common development issues
- Common production issues
- Debugging guides
- Error code reference
- Performance troubleshooting" && ((created++)) || ((failed++))

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Successfully created: $created issues${NC}"
if [ $failed -gt 0 ]; then
    echo -e "${RED}✗ Failed to create: $failed issues${NC}"
fi
echo -e "${BLUE}========================================${NC}"
echo ""
echo "View all issues: gh issue list"
echo "Or visit: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/issues"
