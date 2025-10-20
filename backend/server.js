require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');
const crypto = require('crypto');
const { detectSuspiciousActivity, securityHeaders, sanitizeResponse } = require('./middleware/security');
const { errorHandler, notFoundHandler, asyncHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Security: Request size limits
app.use(express.json({ limit: '1mb' }));

// Security: Sanitize data against NoSQL injection and XSS
app.use(mongoSanitize());

// Security: Detect suspicious activity
app.use(detectSuspiciousActivity);

// Security: Add security-focused HTTP headers
app.use(securityHeaders);

// Security: Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit chat requests to 20 per minute
  message: 'Too many chat requests, please slow down.',
});

app.use('/api/', apiLimiter);

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

app.post('/api/chat', chatLimiter, validateChat, asyncHandler(async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { messages, systemPrompt, temperature = 0.7 } = req.body;
    
    // Additional validation
    if (messages.length > 50) {
      return res.status(400).json({ error: 'Too many messages in conversation' });
    }
    
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'XAI_API_KEY not configured' });
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

    res.json(response.data);
  } catch (error) {
    console.error('Error calling Grok API:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error?.message || 'Failed to get response from Grok' 
    });
  }
}));

app.post('/api/evaluate', chatLimiter, validateEvaluate, asyncHandler(async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { outputs, criteria, context } = req.body;
    
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

app.get('/api/health', (req, res) => {
  const apiKey = process.env.XAI_API_KEY;
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasApiKey: !!apiKey,
    // Don't expose sensitive config details
  });
});

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`API Key configured: ${!!process.env.XAI_API_KEY}`);
});
