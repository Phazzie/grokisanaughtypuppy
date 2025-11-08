/**
 * Swagger API Documentation Configuration
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Grok Chat API',
      version: '1.0.0',
      description: 'API documentation for the Grok Chat application - A powerful conversational AI interface powered by grok-4-fast-reasoning',
      contact: {
        name: 'API Support',
        url: 'https://github.com/yourusername/grok-chat',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://grokisanaughtypuppy-yn23q.ondigitalocean.app',
        description: 'Production server',
      },
    ],
    tags: [
      {
        name: 'Chat',
        description: 'Chat and evaluation endpoints',
      },
      {
        name: 'Conversations',
        description: 'Conversation management and retrieval',
      },
      {
        name: 'Uploads',
        description: 'File upload and import operations',
      },
      {
        name: 'Health',
        description: 'Health check and status endpoints',
      },
    ],
    components: {
      schemas: {
        Message: {
          type: 'object',
          required: ['role', 'content'],
          properties: {
            role: {
              type: 'string',
              enum: ['user', 'assistant', 'system'],
              description: 'The role of the message sender',
            },
            content: {
              type: 'string',
              maxLength: 10000,
              description: 'The message content',
            },
          },
        },
        ChatRequest: {
          type: 'object',
          required: ['messages'],
          properties: {
            messages: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Message',
              },
              description: 'Array of chat messages',
            },
            systemPrompt: {
              type: 'string',
              maxLength: 2000,
              description: 'System prompt to guide AI behavior',
            },
            temperature: {
              type: 'number',
              minimum: 0,
              maximum: 2,
              default: 0.7,
              description: 'Controls randomness in responses (0-2)',
            },
          },
        },
        ChatResponse: {
          type: 'object',
          properties: {
            choices: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  message: {
                    $ref: '#/components/schemas/Message',
                  },
                },
              },
            },
            cached: {
              type: 'boolean',
              description: 'Whether the response was served from cache',
            },
          },
        },
        EvaluateRequest: {
          type: 'object',
          required: ['outputs'],
          properties: {
            outputs: {
              type: 'array',
              items: {
                type: 'string',
                maxLength: 10000,
              },
              minItems: 1,
              maxItems: 10,
              description: 'Array of outputs to evaluate',
            },
            criteria: {
              type: 'string',
              maxLength: 1000,
              description: 'Evaluation criteria',
            },
            context: {
              type: 'string',
              maxLength: 5000,
              description: 'Context for evaluation',
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ok', 'degraded'],
              description: 'Overall system health status',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp of health check',
            },
            checks: {
              type: 'object',
              properties: {
                apiKey: {
                  type: 'boolean',
                  description: 'Whether API key is configured',
                },
                database: {
                  type: 'boolean',
                  description: 'Database connection status',
                },
                uptime: {
                  type: 'integer',
                  description: 'Server uptime in seconds',
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              default: false,
            },
            error: {
              type: 'string',
              description: 'Error message',
            },
            statusCode: {
              type: 'integer',
              description: 'HTTP status code',
            },
          },
        },
      },
      responses: {
        BadRequest: {
          description: 'Bad Request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        Unauthorized: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        TooManyRequests: {
          description: 'Too Many Requests',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
    },
  },
  apis: ['./server.js', './routes/**/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
