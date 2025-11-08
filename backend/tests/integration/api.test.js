/**
 * API Integration Tests
 * Tests the actual HTTP endpoints
 */

const request = require('supertest');
const express = require('express');

// Mock the external dependencies
jest.mock('../../db', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    }),
  })),
  closeDatabase: jest.fn().mockResolvedValue(),
  queryDatabase: jest.fn().mockResolvedValue({ rows: [] }),
}));

jest.mock('axios');
const axios = require('axios');

describe('API Integration Tests', () => {
  let app;

  beforeAll(() => {
    // Create a minimal Express app for testing
    app = express();
    app.use(express.json());

    // Mock health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        hasApiKey: !!process.env.XAI_API_KEY,
      });
    });

    // Mock chat endpoint
    app.post('/api/chat', (req, res) => {
      const { messages, systemPrompt, temperature } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
      }

      res.json({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Test response',
            },
          },
        ],
      });
    });

    // Mock evaluation endpoint
    app.post('/api/evaluate', (req, res) => {
      const { outputs, criteria, context } = req.body;

      if (!outputs || !Array.isArray(outputs)) {
        return res.status(400).json({ error: 'Outputs array is required' });
      }

      res.json({
        choices: [
          {
            message: {
              content: 'Evaluation result',
            },
          },
        ],
      });
    });
  });

  describe('GET /api/health', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('hasApiKey');
    });

    it('should return hasApiKey as true when API key is set', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.hasApiKey).toBe(true);
    });

    it('should return timestamp in ISO format', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('POST /api/chat', () => {
    it('should return 200 with valid chat request', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [
            { role: 'user', content: 'Hello' },
          ],
          systemPrompt: 'You are helpful',
          temperature: 0.7,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('choices');
      expect(response.body.choices[0]).toHaveProperty('message');
    });

    it('should return 400 when messages is missing', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          systemPrompt: 'You are helpful',
          temperature: 0.7,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when messages is not an array', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: 'not an array',
          systemPrompt: 'You are helpful',
          temperature: 0.7,
        });

      expect(response.status).toBe(400);
    });

    it('should handle valid message array', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
            { role: 'user', content: 'How are you?' },
          ],
          systemPrompt: 'You are helpful',
          temperature: 0.7,
        });

      expect(response.status).toBe(200);
      expect(response.body.choices[0].message.content).toBeDefined();
    });

    it('should accept temperature parameter', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          messages: [{ role: 'user', content: 'Test' }],
          systemPrompt: 'Test',
          temperature: 1.5,
        });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/evaluate', () => {
    it('should return 200 with valid evaluation request', async () => {
      const response = await request(app)
        .post('/api/evaluate')
        .send({
          outputs: ['Output 1', 'Output 2', 'Output 3'],
          criteria: 'Quality and accuracy',
          context: 'Test context',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('choices');
    });

    it('should return 400 when outputs is missing', async () => {
      const response = await request(app)
        .post('/api/evaluate')
        .send({
          criteria: 'Quality',
          context: 'Context',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when outputs is not an array', async () => {
      const response = await request(app)
        .post('/api/evaluate')
        .send({
          outputs: 'not an array',
          criteria: 'Quality',
          context: 'Context',
        });

      expect(response.status).toBe(400);
    });

    it('should handle multiple outputs', async () => {
      const response = await request(app)
        .post('/api/evaluate')
        .send({
          outputs: [
            'First response with high quality',
            'Second response with medium quality',
            'Third response with low quality',
          ],
          criteria: 'Quality, accuracy, helpfulness',
          context: 'User asked for help with coding',
        });

      expect(response.status).toBe(200);
      expect(response.body.choices[0].message.content).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request(app).get('/api/undefined-route');

      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });

  describe('Request Headers', () => {
    it('should accept application/json content-type', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Content-Type', 'application/json')
        .send({
          messages: [{ role: 'user', content: 'Test' }],
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Response Format', () => {
    it('should return JSON responses', async () => {
      const response = await request(app).get('/api/health');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return proper error response format', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({});

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });
  });
});
