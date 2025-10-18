# Google Gemini Instructions

## Project Context
**Grok Chat Application** - An AI-powered chat interface showcasing X.AI's Grok-4-fast-reasoning model with advanced features like A/B testing, response evaluation, and conversation management.

**Tech Stack:**
- Frontend: Angular 19, TypeScript, Tailwind CSS
- Backend: Node.js, Express.js, Axios
- API: X.AI Grok-4-fast-reasoning

## How to Help with This Project

### Understanding the Architecture
This is a **two-tier application**:
1. **Angular Frontend** (`grok-chat/`): User interface with chat, settings, and conversation management
2. **Express Backend** (`backend/`): API proxy that handles requests to X.AI's Grok API

The backend acts as a proxy to:
- Secure the API key (not exposed to frontend)
- Add custom logic for evaluation and formatting
- Enable CORS for local development

### When Suggesting Code Changes

#### For Frontend (Angular/TypeScript)
- Use **standalone components** (this project doesn't use NgModules)
- Leverage Angular's **signals** for reactive state when appropriate
- Follow the existing **glass morphism** design aesthetic
- Maintain the **purple/pink/blue gradient** color scheme
- Keep TypeScript **strictly typed** - avoid `any` types
- Use **RxJS observables** for async operations with proper error handling

#### For Backend (Node.js/Express)
- Keep endpoints **simple and focused**
- Use **async/await** consistently
- Always validate inputs before processing
- Return **appropriate HTTP status codes**
- Log errors with enough context for debugging
- Maintain the API proxy pattern (don't add direct frontend-to-Grok calls)

### Grok API Specifics
When working with Grok API integration:
- **Model name**: Always use `"grok-4-fast-reasoning"`
- **Temperature range**: 0 to 2 (not 0 to 1 like some models)
- **System prompts**: Must be the first message in the array
- **Response format**: OpenAI-compatible format
- **Authentication**: Bearer token in Authorization header

Example request structure:
```json
{
  "model": "grok-4-fast-reasoning",
  "messages": [
    { "role": "system", "content": "System prompt here" },
    { "role": "user", "content": "User message" }
  ],
  "temperature": 0.7,
  "stream": false
}
```

### UI/UX Guidelines
This project emphasizes a **modern, playful aesthetic**:
- **Glass morphism effects**: `backdrop-blur`, semi-transparent backgrounds
- **Smooth animations**: 150-300ms transitions
- **Emoji-rich interface**: Use emojis in buttons and labels for personality
- **Responsive design**: Mobile-first approach
- **Color palette**: Purple (`#9333ea`), pink (`#ec4899`), blue (`#3b82f6`)
- **Gradients**: Multi-color gradients for backgrounds and buttons

### Common Tasks & How to Approach Them

#### Adding a New Feature
1. **Frontend Service**: Update `chat.service.ts` with new methods
2. **Backend Endpoint**: Add route in `server.js`
3. **Component Logic**: Update `app.ts` with new functionality
4. **UI Template**: Modify `app.html` with new controls
5. **Styling**: Add styles to `app.scss` or `styles.scss`
6. **Error Handling**: Add try-catch and user feedback

#### Debugging Issues
1. **Check browser console** for frontend errors
2. **Check backend terminal** for API errors
3. **Verify environment variables** (XAI_API_KEY)
4. **Test API endpoints** directly with curl or Postman
5. **Check CORS settings** if seeing network errors

#### Performance Optimization
- Minimize API calls (cache when appropriate)
- Optimize Angular change detection
- Lazy load components if the app grows
- Compress and optimize images
- Use Angular production build for deployment

### Environment Configuration

#### Development
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:4200`
- CORS: Enabled for all origins (dev only)

#### Production (to be configured)
- Use environment variables for API URLs
- Restrict CORS to specific domains
- Enable rate limiting
- Add request validation
- Implement proper logging

### Testing Approach
When suggesting tests:
- **Unit tests**: For services and pure functions
- **Component tests**: For UI logic
- **Integration tests**: For API endpoints
- **E2E tests**: For critical user flows
- Focus on error scenarios and edge cases

### Security Considerations
Always keep in mind:
- ✅ API keys in environment variables (never in code)
- ✅ Input validation on backend
- ✅ Sanitize user inputs to prevent XSS
- ✅ Rate limiting for production
- ✅ Proper CORS configuration
- ✅ HTTPS for production deployment

### Deployment Recommendations

#### For Quick Deployment
1. **Frontend**: Deploy to Vercel or Netlify
   - Build: `ng build --configuration production`
   - Serve: `dist/grok-chat/browser/`

2. **Backend**: Deploy to Vercel, Railway, or Render
   - Ensure environment variables are set
   - Configure production CORS

#### For Scalable Deployment
- Use Docker for containerization
- Deploy to AWS, GCP, or Azure
- Set up CI/CD pipeline (GitHub Actions)
- Configure monitoring and logging
- Set up health checks and auto-scaling

### Code Style Preferences
- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Always use them
- **TypeScript**: Strict mode enabled
- **Naming**: camelCase for variables, PascalCase for classes
- **Comments**: Explain "why" not "what"

### When You're Unsure
If a request is ambiguous:
1. Ask clarifying questions
2. Suggest multiple approaches with pros/cons
3. Recommend the approach that best fits existing patterns
4. Consider backwards compatibility
5. Think about mobile and accessibility

### Project Goals & Vision
This project aims to:
- Showcase Grok API capabilities
- Demonstrate modern Angular patterns
- Provide excellent UX with beautiful UI
- Enable advanced features (A/B testing, evaluation)
- Be easily deployable and maintainable

When making suggestions, keep these goals in mind and prioritize user experience, code quality, and maintainability over adding complexity.

## Response Format Preferences
When providing code suggestions:
1. **Explain the change** briefly before showing code
2. **Show complete functions/components** when possible (not just snippets)
3. **Include error handling** in examples
4. **Mention any dependencies** that need to be installed
5. **Note any breaking changes** or migration steps needed
6. **Consider mobile responsiveness** in UI suggestions

## Working with Conversations
Remember:
- This app stores conversations in **localStorage**
- Conversations include full message history
- Each message has: `role`, `content`, `timestamp`
- System prompts are configurable per session
- A/B test mode creates branching conversations

When suggesting features related to conversation management, maintain this structure and ensure localStorage operations are safe and handle edge cases (quota exceeded, JSON parse errors, etc.).
