/**
 * API v1 Routes
 * Main router for version 1 of the API
 */

const express = require('express');
const router = express.Router();

// Import route modules
const chatRoutes = require('./chat');
const healthRoutes = require('./health');
const conversationRoutes = require('./conversations');
const uploadRoutes = require('./upload');

// Mount routes
router.use('/chat', chatRoutes);
router.use('/evaluate', chatRoutes); // Part of chat functionality
router.use('/health', healthRoutes);
router.use('/conversations', conversationRoutes);
router.use('/topics', conversationRoutes); // Topics are part of conversations
router.use('/imports', conversationRoutes); // Imports are part of conversations
router.use('/upload', uploadRoutes);

// API version info endpoint
router.get('/', (req, res) => {
  res.json({
    version: '1.0.0',
    status: 'stable',
    endpoints: {
      chat: 'POST /api/v1/chat',
      evaluate: 'POST /api/v1/evaluate',
      upload: 'POST /api/v1/upload',
      health: 'GET /api/v1/health',
      conversations: 'GET /api/v1/conversations',
      imports: 'GET /api/v1/imports',
      topics: 'GET /api/v1/topics',
    },
    documentation: 'https://docs.example.com/api/v1',
  });
});

module.exports = router;
