require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Grok API endpoint
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, systemPrompt, temperature = 0.7 } = req.body;
    
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
});

app.post('/api/evaluate', async (req, res) => {
  try {
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
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasApiKey: !!process.env.XAI_API_KEY });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`API Key configured: ${!!process.env.XAI_API_KEY}`);
});
