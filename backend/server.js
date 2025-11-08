require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const logger = require('./utils/logger');
const cache = require('./utils/cache');
const { detectSuspiciousActivity, securityHeaders, sanitizeResponse } = require('./middleware/security');
const { errorHandler, notFoundHandler, asyncHandler } = require('./middleware/errorHandler');
const db = require('./db');
const { parseChatGPTExport, validateConversation } = require('./conversationParser');
const { analyzeConversation, categorizeTopics, generateInsights } = require('./analysisService');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// Sentry integration (production only)
if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
  });
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// Request ID tracking middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);

  // Attach logger with request context
  req.logger = logger.withRequest(req);

  // Log request with ID
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    req.logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
    });

    // Log slow requests
    if (duration > 1000) {
      logger.performance('slow_request', duration, {
        method: req.method,
        path: req.path,
      });
    }
  });

  next();
});

// Compression: Gzip responses for better performance
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between speed and compression ratio
}));

// Security: Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Security: Restrict CORS to specific origins
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:4200', 'https://grokisanaughtypuppy-yn23q.ondigitalocean.app'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Security: Request size limits (increase for file uploads)
app.use(express.json({ limit: '10mb' }));

// Security: Sanitize data against NoSQL injection and XSS
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn('Sanitized input detected:', { ip: req.ip, key, timestamp: new Date().toISOString() });
  }
}));

// Security: Detect suspicious activity
app.use(detectSuspiciousActivity);

// Security: Add security-focused HTTP headers
app.use(securityHeaders);

// Security: Rate limiting (configurable via environment)
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health', // Don't rate limit health checks
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.CHAT_RATE_LIMIT_MAX) || 20,
  message: 'Too many chat requests, please slow down.',
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX) || 10,
  message: 'Too many upload requests, please try again later.',
});

app.use('/api/', apiLimiter);

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Only accept JSON files
    if (file.mimetype === 'application/json' || path.extname(file.originalname) === '.json') {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'));
    }
  }
});

// Initialize database on startup
db.createTables().catch(err => {
  console.error('Failed to initialize database:', err);
});

// Grok API endpoint
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

// Validation middleware
const validateChat = [
  body('messages').isArray().withMessage('Messages must be an array'),
  body('messages.*.role').isIn(['user', 'assistant', 'system']).withMessage('Invalid role'),
  body('messages.*.content').isString().trim().notEmpty().withMessage('Message content required'),
  body('messages.*.content').isLength({ max: 10000 }).withMessage('Message content too long'),
  body('systemPrompt').optional().isString().trim().isLength({ max: 2000 }).withMessage('System prompt too long'),
  body('temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature must be 0-2'),
];

const validateEvaluate = [
  body('outputs').isArray().withMessage('Outputs must be an array'),
  body('outputs').isLength({ min: 1, max: 10 }).withMessage('Outputs must contain 1-10 items'),
  body('outputs.*').isString().trim().notEmpty().withMessage('Output content required'),
  body('outputs.*').isLength({ max: 10000 }).withMessage('Output content too long'),
  body('criteria').optional().isString().trim().isLength({ max: 1000 }).withMessage('Criteria too long'),
  body('context').optional().isString().trim().isLength({ max: 5000 }).withMessage('Context too long'),
];

/**
 * @swagger
 * /api/v1/chat:
 *   post:
 *     tags: [Chat]
 *     summary: Send chat messages to Grok AI
 *     description: Send a conversation to the Grok API and receive a response. Supports caching to reduce API calls.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatRequest'
 *           example:
 *             messages:
 *               - role: user
 *                 content: "Hello, how are you?"
 *             systemPrompt: "You are a helpful AI assistant"
 *             temperature: 0.7
 *     responses:
 *       200:
 *         description: Successful response from Grok
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// V1 Chat endpoint
app.post('/api/v1/chat', chatLimiter, validateChat, asyncHandler(async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { messages, systemPrompt, temperature = parseFloat(process.env.DEFAULT_TEMPERATURE) || 0.7 } = req.body;

    // Additional validation
    if (messages.length > 50) {
      return res.status(400).json({ error: 'Too many messages in conversation' });
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'XAI_API_KEY not configured' });
    }

    // Check cache (unless explicitly disabled)
    const cacheKey = cache.generateCacheKey({ messages, systemPrompt, temperature });
    if (!req.query.noCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        req.logger.info('Cache hit for chat request');
        return res.json({ ...cached, cached: true });
      }
    }

    const messagesWithSystem = [
      { role: 'system', content: systemPrompt || 'You are Grok, a helpful AI assistant.' },
      ...messages
    ];

    const response = await axios.post(
      GROK_API_URL,
      {
        model: 'grok-4-fast-reasoning',
        messages: messagesWithSystem,
        temperature,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Cache the response
    cache.set(cacheKey, response.data);

    res.json(response.data);
  } catch (error) {
    req.logger.error('Error calling Grok API', {
      error: error.response?.data || error.message
    });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error?.message || 'Failed to get response from Grok'
    });
  }
}));

// V1 Evaluate endpoint
app.post('/api/v1/evaluate', chatLimiter, validateEvaluate, asyncHandler(async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { outputs, criteria, context } = req.body;
    
    // Additional validation
    if (outputs.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 outputs allowed for evaluation' });
    }
    
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'XAI_API_KEY not configured' });
    }

    const evaluationPrompt = `You are an expert evaluator. Evaluate the following outputs based on the given criteria.

Context: ${context || 'N/A'}

Criteria: ${criteria || 'Quality, accuracy, helpfulness, and clarity'}

Outputs to evaluate:
${outputs.map((output, i) => `Output ${i + 1}: ${output}`).join('\n\n')}

Please provide:
1. A detailed evaluation of each output
2. A ranking from best to worst
3. Specific strengths and weaknesses
4. An overall recommendation`;

    const response = await axios.post(
      GROK_API_URL,
      {
        model: 'grok-4-fast-reasoning',
        messages: [
          { role: 'system', content: 'You are an expert AI evaluator with deep knowledge of language models and their outputs.' },
          { role: 'user', content: evaluationPrompt }
        ],
        temperature: 0.3,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error evaluating outputs:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error?.message || 'Failed to evaluate outputs' 
    });
  }
}));

// ============ NEW CONVERSATION UPLOAD & ANALYSIS ENDPOINTS ============

// Upload ChatGPT conversations JSON file
// V1 Upload endpoint
app.post('/api/v1/upload', uploadLimiter, upload.single('file'), asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.body.userId || 'anonymous';
    const filePath = req.file.path;

    // Read and parse the JSON file
    const fileContent = await fs.readFile(filePath, 'utf8');
    let jsonData;

    try {
      jsonData = JSON.parse(fileContent);
    } catch (parseError) {
      await fs.unlink(filePath); // Clean up file
      return res.status(400).json({ error: 'Invalid JSON file' });
    }

    // Create import record
    const importRecord = await db.createImport(userId, req.file.originalname, req.file.size);

    // Parse conversations
    const conversations = parseChatGPTExport(jsonData);

    if (conversations.length === 0) {
      await db.updateImportStatus(importRecord.id, 'failed', 0, 0, 'No valid conversations found in file');
      await fs.unlink(filePath); // Clean up file
      return res.status(400).json({ error: 'No valid conversations found in file' });
    }

    // Update import with total count
    await db.updateImportStatus(importRecord.id, 'processing', conversations.length, 0);

    // Process conversations in the background
    processConversationsAsync(importRecord.id, userId, conversations, filePath);

    res.json({
      success: true,
      importId: importRecord.id,
      totalConversations: conversations.length,
      message: `Processing ${conversations.length} conversations. This may take a few minutes.`
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: 'Failed to process upload' });
  }
}));

// Get import status
// V1 Get import status
app.get('/api/v1/imports/:importId', asyncHandler(async (req, res) => {
  const { importId } = req.params;
  const userId = req.query.userId || 'anonymous';

  const imports = await db.listImports(userId);
  const importRecord = imports.find(i => i.id === importId);

  if (!importRecord) {
    return res.status(404).json({ error: 'Import not found' });
  }

  res.json(importRecord);
}));

// List all imports for a user
// V1 List imports
app.get('/api/v1/imports', asyncHandler(async (req, res) => {
  const userId = req.query.userId || 'anonymous';
  const imports = await db.listImports(userId);
  res.json(imports);
}));

// List all topics
// V1 List topics
app.get('/api/v1/topics', asyncHandler(async (req, res) => {
  const userId = req.query.userId || null;
  const topics = await db.listTopics(userId);
  res.json(topics);
}));

// Get conversations by topic
// V1 Get conversations by topic
app.get('/api/v1/topics/:topicId/conversations', asyncHandler(async (req, res) => {
  const { topicId } = req.params;
  const userId = req.query.userId || null;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  const conversations = await db.getConversationsByTopic(topicId, userId, limit, offset);
  res.json(conversations);
}));

// Get conversation with full analysis
// V1 Get conversation by ID
app.get('/api/v1/conversations/:conversationId', asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  const conversation = await db.getConversationWithAnalysis(conversationId);

  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  res.json(conversation);
}));

// List conversations (optionally filtered by source)
// V1 List conversations
app.get('/api/v1/conversations', asyncHandler(async (req, res) => {
  const userId = req.query.userId || 'anonymous';
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  const conversations = await db.listConversations(userId, limit, offset);
  res.json(conversations);
}));

// ============ API VERSIONING ============

/**
 * API Version Middleware
 * Adds version information to responses and enables versioning
 */
app.use((req, res, next) => {
  // Extract version from path or use default v1
  const versionMatch = req.path.match(/^\/api\/v(\d+)\//);
  req.apiVersion = versionMatch ? `v${versionMatch[1]}` : 'v1';

  // Add version header to all API responses
  if (req.path.startsWith('/api/')) {
    res.setHeader('X-API-Version', req.apiVersion);
    res.setHeader('X-Supported-Versions', 'v1');
  }

  next();
});

// ============ API V1 ENDPOINTS ============

// Swagger API documentation
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Grok Chat API Documentation',
}));

// API Version info endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    version: '1.0.0',
    status: 'stable',
    endpoints: [
      { method: 'POST', path: '/api/v1/chat', description: 'Send chat messages to Grok' },
      { method: 'POST', path: '/api/v1/evaluate', description: 'Evaluate multiple outputs' },
      { method: 'POST', path: '/api/v1/upload', description: 'Upload ChatGPT export' },
      { method: 'GET', path: '/api/v1/health', description: 'Health check endpoint' },
      { method: 'GET', path: '/api/v1/conversations', description: 'List conversations' },
      { method: 'GET', path: '/api/v1/conversations/:id', description: 'Get conversation by ID' },
      { method: 'GET', path: '/api/v1/imports', description: 'List imports' },
      { method: 'GET', path: '/api/v1/imports/:id', description: 'Get import status' },
      { method: 'GET', path: '/api/v1/topics', description: 'List topics' },
      { method: 'GET', path: '/api/v1/topics/:id/conversations', description: 'Get conversations by topic' },
    ],
    documentation: '/api/v1/docs',
  });
});

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     tags: [Health]
 *     summary: Health check endpoint
 *     description: Check the health status of the API, including database and API key configuration
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *       503:
 *         description: System is degraded or unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
app.get('/api/v1/health', asyncHandler(async (req, res) => {
  const apiKey = process.env.XAI_API_KEY;
  const dbHealthy = await db.checkDatabase();

  const health = {
    status: dbHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: {
      apiKey: !!apiKey,
      database: dbHealthy,
      uptime: Math.floor(process.uptime())
    }
  };

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
}));


// ============ BACKGROUND PROCESSING ============

/**
 * Process conversations asynchronously
 */
async function processConversationsAsync(importId, userId, conversations, filePath) {
  try {
    let processed = 0;

    for (const conversation of conversations) {
      try {
        // Validate conversation
        if (!validateConversation(conversation)) {
          console.warn(`Skipping invalid conversation: ${conversation.originalId}`);
          continue;
        }

        // Import conversation to database
        const conversationId = await db.importChatGPTConversation(
          importId,
          userId,
          conversation,
          conversation.messages,
          conversation.originalId,
          conversation.originalTitle
        );

        // Analyze conversation
        try {
          const analysis = await analyzeConversation(conversation);

          // Save analysis
          await db.createAnalysis(
            conversationId,
            analysis.summary,
            analysis.mainTopics,
            analysis.sentiment,
            analysis.complexityScore
          );

          // Get analysis ID for insights
          const analysisResult = await db.initDatabase().query(
            'SELECT id FROM conversation_analyses WHERE conversation_id = $1',
            [conversationId]
          );

          if (analysisResult.rows.length > 0) {
            const analysisId = analysisResult.rows[0].id;

            // Generate and save insights
            const insights = await generateInsights(conversation, conversation.messages);
            for (const insight of insights) {
              await db.addInsight(
                analysisId,
                insight.insightType,
                insight.title,
                insight.description,
                null,
                insight.confidenceScore
              );
            }
          }

          // Categorize topics
          const topics = await categorizeTopics(conversation);
          for (const topic of topics) {
            const topicRecord = await db.createOrGetTopic(topic.name, topic.description);
            await db.linkConversationToTopic(conversationId, topicRecord.id, topic.relevanceScore);
          }

        } catch (analysisError) {
          console.error(`Error analyzing conversation ${conversationId}:`, analysisError);
          // Continue processing even if analysis fails
        }

        processed++;

        // Update progress
        await db.updateImportStatus(importId, 'processing', conversations.length, processed);

      } catch (convError) {
        console.error(`Error processing conversation ${conversation.originalId}:`, convError);
        // Continue with next conversation
      }
    }

    // Mark import as completed
    await db.updateImportStatus(importId, 'completed', conversations.length, processed);

    // Clean up uploaded file
    await fs.unlink(filePath).catch(() => {});

    console.log(`✅ Import ${importId} completed: ${processed}/${conversations.length} conversations processed`);

  } catch (error) {
    console.error(`Error processing import ${importId}:`, error);
    await db.updateImportStatus(importId, 'failed', 0, 0, error.message);

    // Clean up file on error
    await fs.unlink(filePath).catch(() => {});
  }
}

// ============ BACKWARD COMPATIBILITY ALIASES ============
// Redirect /api/* to /api/v1/* for backward compatibility
// This ensures existing clients continue to work

app.post('/api/chat', (req, res, next) => {
  req.url = '/api/v1/chat';
  app._router.handle(req, res, next);
});

app.post('/api/evaluate', (req, res, next) => {
  req.url = '/api/v1/evaluate';
  app._router.handle(req, res, next);
});

app.post('/api/upload', (req, res, next) => {
  req.url = '/api/v1/upload';
  app._router.handle(req, res, next);
});

app.get('/api/health', (req, res, next) => {
  req.url = '/api/v1/health';
  app._router.handle(req, res, next);
});

app.get('/api/imports/:importId', (req, res, next) => {
  req.url = `/api/v1/imports/${req.params.importId}`;
  app._router.handle(req, res, next);
});

app.get('/api/imports', (req, res, next) => {
  req.url = '/api/v1/imports';
  app._router.handle(req, res, next);
});

app.get('/api/topics', (req, res, next) => {
  req.url = '/api/v1/topics';
  app._router.handle(req, res, next);
});

app.get('/api/topics/:topicId/conversations', (req, res, next) => {
  req.url = `/api/v1/topics/${req.params.topicId}/conversations`;
  app._router.handle(req, res, next);
});

app.get('/api/conversations/:conversationId', (req, res, next) => {
  req.url = `/api/v1/conversations/${req.params.conversationId}`;
  app._router.handle(req, res, next);
});

app.get('/api/conversations', (req, res, next) => {
  req.url = '/api/v1/conversations';
  app._router.handle(req, res, next);
});

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// Validate environment variables on startup
function validateEnvironment() {
  const required = ['XAI_API_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }

  // Validate numeric environment variables
  const numericVars = {
    PORT: process.env.PORT,
    DB_PORT: process.env.DB_PORT,
    DB_POOL_MAX: process.env.DB_POOL_MAX,
    DB_POOL_MIN: process.env.DB_POOL_MIN,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
  };

  for (const [key, value] of Object.entries(numericVars)) {
    if (value && isNaN(Number(value))) {
      console.error(`❌ Environment variable ${key} must be a number, got: ${value}`);
      process.exit(1);
    }
  }

  // Validate temperature range
  const defaultTemp = parseFloat(process.env.DEFAULT_TEMPERATURE);
  if (defaultTemp && (defaultTemp < 0 || defaultTemp > 2)) {
    console.error(`❌ DEFAULT_TEMPERATURE must be between 0 and 2, got: ${defaultTemp}`);
    process.exit(1);
  }

  // Validate NODE_ENV
  const validEnvs = ['development', 'production', 'test'];
  if (process.env.NODE_ENV && !validEnvs.includes(process.env.NODE_ENV)) {
    console.warn(`⚠️  NODE_ENV should be one of: ${validEnvs.join(', ')}, got: ${process.env.NODE_ENV}`);
  }

  console.log('✅ All required environment variables are set and validated');
}

validateEnvironment();

const server = app.listen(PORT, () => {
  const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
  const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`Rate limiting: ${rateLimitMax} requests per ${rateLimitWindow / 60000} minutes`);
  console.log('✅ Security measures active: Helmet, CORS, Rate Limiting, Input Validation, Compression');
});

// Graceful shutdown handling
function gracefulShutdown(signal) {
  console.log(`\n⚠️  Received ${signal}, starting graceful shutdown...`);

  server.close(async () => {
    console.log('✅ HTTP server closed');

    // Close database connections
    try {
      await db.closeDatabase();
      console.log('✅ Database connections closed');
    } catch (err) {
      console.error('❌ Error closing database:', err);
    }

    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});
