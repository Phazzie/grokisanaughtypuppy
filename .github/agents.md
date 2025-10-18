# AI Agents Instructions

## Project Overview
**Repository**: grokisanaughtypuppy  
**Purpose**: AI chat application showcasing X.AI's Grok-4-fast-reasoning model  
**Type**: Full-stack web application (Angular + Node.js/Express)

## System Architecture

### Frontend Layer
- **Framework**: Angular 19 (standalone components architecture)
- **Language**: TypeScript with strict type checking
- **Styling**: Tailwind CSS + SCSS with custom glass morphism theme
- **State**: Component-based with RxJS observables
- **Build Tool**: Angular CLI
- **Target Browsers**: Modern browsers (ES2022+)

### Backend Layer
- **Runtime**: Node.js
- **Framework**: Express.js
- **Purpose**: API proxy for X.AI Grok API
- **Security**: API key stored in environment variables
- **CORS**: Enabled for local development

### External Dependencies
- **X.AI Grok API**: Primary AI model provider
  - Model: `grok-4-fast-reasoning`
  - Endpoint: `https://api.x.ai/v1/chat/completions`
  - Authentication: Bearer token

## Project Structure
```
grokisanaughtypuppy/
├── .github/                    # GitHub configuration
│   ├── copilot-instructions.md # GitHub Copilot context
│   ├── gemini.md              # Google Gemini context
│   └── agents.md              # This file
├── backend/                    # Express.js API server
│   ├── server.js              # Main server file
│   ├── package.json           # Node.js dependencies
│   ├── .env.example           # Environment template
│   └── .env                   # Local environment (not in git)
├── grok-chat/                 # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.ts         # Main component
│   │   │   ├── app.html       # Component template
│   │   │   ├── app.scss       # Component styles
│   │   │   └── services/
│   │   │       └── chat.service.ts  # API communication
│   │   ├── styles.scss        # Global styles
│   │   └── index.html         # HTML entry point
│   ├── angular.json           # Angular configuration
│   ├── package.json           # npm dependencies
│   └── tsconfig.json          # TypeScript configuration
└── README.md                  # Project documentation
```

## Autonomous Task Execution Guidelines

### When Implementing New Features

#### 1. Planning Phase
- **Analyze Requirements**: Understand user intent fully
- **Check Existing Code**: Review current implementation patterns
- **Identify Touchpoints**: Determine which files need changes
- **Consider Impact**: Think about backwards compatibility
- **Plan Testing**: How will you verify it works?

#### 2. Implementation Phase
- **Frontend Changes**:
  1. Update TypeScript interfaces if adding new data structures
  2. Modify service methods in `chat.service.ts`
  3. Update component logic in `app.ts`
  4. Modify template in `app.html`
  5. Add/update styles in `app.scss`
  
- **Backend Changes**:
  1. Add/modify Express routes in `server.js`
  2. Implement error handling
  3. Add input validation
  4. Update response formatting
  
- **Both Layers**:
  1. Ensure contract between frontend and backend is clear
  2. Add proper TypeScript types
  3. Handle all error cases
  4. Consider edge cases

#### 3. Testing Phase
- Test API endpoints directly (curl/Postman)
- Verify frontend UI updates correctly
- Test error scenarios
- Check responsive design
- Validate accessibility

#### 4. Documentation Phase
- Update README.md if user-facing feature
- Add code comments for complex logic
- Update environment variable examples if needed

### Code Quality Standards

#### TypeScript/Angular
```typescript
// ✅ Good: Strongly typed, clear, handles errors
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

sendMessage(message: ChatMessage): Observable<ApiResponse> {
  return this.http.post<ApiResponse>(this.apiUrl, message)
    .pipe(
      catchError(error => {
        console.error('Failed to send message:', error);
        return throwError(() => new Error('Failed to send message'));
      })
    );
}

// ❌ Bad: Untyped, no error handling
sendMessage(message: any) {
  return this.http.post(this.apiUrl, message);
}
```

#### Node.js/Express
```javascript
// ✅ Good: Async/await, error handling, validation
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, systemPrompt, temperature } = req.body;
    
    // Validate inputs
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }
    
    if (temperature < 0 || temperature > 2) {
      return res.status(400).json({ error: 'Temperature must be between 0 and 2' });
    }
    
    const response = await callGrokAPI(messages, systemPrompt, temperature);
    res.json(response.data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ❌ Bad: No validation, poor error handling
app.post('/api/chat', (req, res) => {
  callGrokAPI(req.body).then(response => res.json(response));
});
```

### Decision-Making Framework

When you need to make decisions:

#### Choosing Technologies/Libraries
1. **Is it necessary?** Can existing tools solve this?
2. **Bundle size**: Will it significantly increase app size?
3. **Maintenance**: Is it actively maintained?
4. **Compatibility**: Works with Angular 19 and Node.js?
5. **Alternatives**: Are there better options?

#### Architectural Decisions
1. **Simplicity**: Choose simpler solutions when possible
2. **Consistency**: Follow existing patterns in the codebase
3. **Scalability**: Will it work if usage increases 10x?
4. **Maintainability**: Will future developers understand it?
5. **Performance**: What's the performance impact?

#### UI/UX Decisions
1. **User Experience**: Does it make the app easier to use?
2. **Accessibility**: Can everyone use it?
3. **Responsive**: Works on all screen sizes?
4. **Brand Consistency**: Matches existing visual style?
5. **Performance**: Does it impact load time or FPS?

### Common Scenarios & Solutions

#### Scenario 1: User Wants to Add a New Chat Feature
**Steps:**
1. Determine if it requires backend changes
2. Design the data flow (user action → frontend → backend → API → response)
3. Update TypeScript interfaces
4. Implement backend endpoint (if needed)
5. Implement frontend service method
6. Update component logic
7. Update UI template
8. Add styling
9. Test thoroughly

#### Scenario 2: API Integration Issues
**Debug Checklist:**
- [ ] Is XAI_API_KEY set correctly in backend .env?
- [ ] Is backend server running on port 3000?
- [ ] Is frontend making requests to correct URL?
- [ ] Check browser network tab for request details
- [ ] Check backend console for error logs
- [ ] Verify CORS is configured correctly
- [ ] Test API endpoint directly with curl

#### Scenario 3: Performance Problems
**Investigation Steps:**
1. Profile the Angular app (Chrome DevTools)
2. Check bundle size (`ng build --stats-json`)
3. Look for unnecessary re-renders
4. Check for memory leaks (subscriptions not unsubscribed)
5. Optimize images and assets
6. Implement lazy loading if needed

#### Scenario 4: Deployment Configuration
**Frontend (Angular):**
```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://your-backend.com/api'
};
```

**Backend (Express):**
```javascript
// Use environment variables
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
```

### Error Handling Philosophy

#### User-Facing Errors
- **Be Clear**: Explain what went wrong in simple terms
- **Be Helpful**: Suggest how to fix it
- **Be Polite**: Don't blame the user
- **Be Specific**: "Failed to send message" not "Error occurred"

#### Developer Errors
- **Log Context**: Include relevant data in console.error()
- **Preserve Stack Traces**: Don't swallow errors
- **Use Appropriate Levels**: error vs warn vs info vs debug

### Security Best Practices

#### Always:
- ✅ Validate all inputs on backend
- ✅ Sanitize user content before rendering
- ✅ Use environment variables for secrets
- ✅ Implement rate limiting in production
- ✅ Use HTTPS in production
- ✅ Set appropriate CORS policies
- ✅ Keep dependencies updated

#### Never:
- ❌ Commit API keys or secrets to git
- ❌ Trust client-side validation alone
- ❌ Expose internal error details to users
- ❌ Use `eval()` or similar dangerous functions
- ❌ Allow unlimited request sizes
- ❌ Disable CORS in production without specific origins

### Deployment Checklist

#### Before Deploying:
- [ ] All environment variables documented
- [ ] Production build tested locally
- [ ] CORS configured for production domains
- [ ] API keys secured in environment (not code)
- [ ] Error logging configured
- [ ] Health check endpoint working
- [ ] Database migrations applied (if applicable)
- [ ] Static assets optimized
- [ ] SSL/TLS configured
- [ ] Monitoring/alerting set up

#### Recommended Platforms:
- **Frontend**: Vercel (recommended), Netlify, GitHub Pages
- **Backend**: Vercel (recommended), Railway, Render, Heroku
- **Full Stack**: Docker on AWS/GCP/Azure

### Interaction with Users

#### When Asking Questions:
- Be specific about what information you need
- Explain why you need it
- Offer reasonable defaults if applicable
- Give examples if helpful

#### When Reporting Progress:
- Be concise but informative
- Highlight important decisions made
- Mention any issues encountered
- Summarize what was accomplished

#### When Encountering Blockers:
- Clearly state the blocker
- Explain what you've tried
- Suggest possible solutions
- Ask for clarification or permission to proceed

### Autonomous Capabilities

You are empowered to:
- ✅ Make minor code improvements without asking
- ✅ Fix obvious bugs
- ✅ Update dependencies (within semver)
- ✅ Improve error messages
- ✅ Add helpful comments
- ✅ Refactor for clarity (preserving functionality)
- ✅ Optimize performance (if measurably better)

You should ask before:
- ❓ Changing core architecture
- ❓ Adding major dependencies
- ❓ Modifying user-facing behavior
- ❓ Changing API contracts
- ❓ Removing features
- ❓ Changing security configurations

### Success Metrics

A successful implementation should:
1. **Work correctly** - Functions as intended without bugs
2. **Handle errors gracefully** - Doesn't break on edge cases
3. **Perform well** - No noticeable performance degradation
4. **Follow patterns** - Consistent with existing code
5. **Be maintainable** - Clear, documented, testable
6. **Be secure** - No new vulnerabilities introduced
7. **Be accessible** - Works for all users
8. **Be responsive** - Works on all device sizes

### Final Notes

This is a **showcase project** demonstrating:
- Modern Angular development practices
- AI API integration patterns
- Full-stack TypeScript/JavaScript development
- Beautiful, functional UI design

When working on this project, prioritize:
1. **User experience** - Make it delightful to use
2. **Code quality** - Make it easy to maintain
3. **Performance** - Keep it fast and responsive
4. **Visual polish** - Make it look professional

Remember: This app represents developer skills. Every detail matters.
