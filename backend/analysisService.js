// Conversation Analysis Service
// Uses Grok AI to analyze conversations, categorize topics, and generate insights

const axios = require('axios');

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';
const XAI_API_KEY = process.env.XAI_API_KEY;

/**
 * Analyze a conversation using Grok AI
 * @param {Object} conversation - Conversation object with messages
 * @returns {Object} - Analysis results
 */
async function analyzeConversation(conversation) {
  try {
    const messages = conversation.messages || [];

    if (messages.length === 0) {
      throw new Error('Conversation has no messages');
    }

    // Create a summary of the conversation for analysis
    const conversationSummary = createConversationSummary(conversation);

    // Use Grok to analyze the conversation
    const prompt = createAnalysisPrompt(conversationSummary);

    const response = await callGrokAPI([
      { role: 'system', content: 'You are an expert conversation analyst. Analyze conversations and provide detailed insights in JSON format.' },
      { role: 'user', content: prompt }
    ], 0.3);

    // Parse the response
    const analysis = parseAnalysisResponse(response);

    return analysis;
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    throw error;
  }
}

/**
 * Categorize conversation into topics using Grok AI
 * @param {Object} conversation - Conversation object
 * @returns {Array} - Array of topics with relevance scores
 */
async function categorizeTopics(conversation) {
  try {
    const conversationSummary = createConversationSummary(conversation);

    const prompt = `Analyze this conversation and identify 1-3 main topics it covers.

Conversation:
Title: ${conversation.name}
Messages: ${conversationSummary.messageCount}
Key themes: ${conversationSummary.preview}

Respond with a JSON array of topics. Each topic should have:
- name: A concise topic name (2-4 words, title case)
- description: Brief description of why this conversation fits this topic
- relevance_score: Confidence score from 0.0 to 1.0

Example format:
[
  {
    "name": "Web Development",
    "description": "Discussion about React components and state management",
    "relevance_score": 0.95
  }
]

Respond ONLY with the JSON array, no additional text.`;

    const response = await callGrokAPI([
      { role: 'system', content: 'You are a topic categorization expert. Respond only with valid JSON.' },
      { role: 'user', content: prompt }
    ], 0.3);

    // Parse topics from response
    const topics = parseTopicsResponse(response);

    return topics;
  } catch (error) {
    console.error('Error categorizing topics:', error);
    // Return empty array on error
    return [];
  }
}

/**
 * Generate insights for a conversation
 * @param {Object} conversation - Conversation object
 * @param {Array} messages - Array of messages
 * @returns {Array} - Array of insights
 */
async function generateInsights(conversation, messages) {
  try {
    const conversationText = formatConversationForAnalysis(messages);

    const prompt = `Analyze this conversation and provide 5-7 unconventional insights.

Conversation Title: ${conversation.name}

${conversationText}

Generate insights in these categories:
1. high_point - A breakthrough or successful moment
2. low_point - A challenge or frustration point
3. pattern - A recurring theme or behavior
4. cognitive_style - How the user thinks/communicates
5. learning_curve - Evidence of progress or learning
6. emotional_arc - The emotional journey of the conversation
7. curiosity_peaks - Moments of high engagement
8. knowledge_gaps - Areas where the user needed more help
9. creative_moments - Innovative or unique ideas expressed
10. meta_insights - Insights about the conversation itself

For each insight, provide:
- insight_type: One of the types above
- title: Brief, catchy title (5-10 words)
- description: Detailed explanation (2-3 sentences)
- confidence_score: Your confidence in this insight (0.0-1.0)

Respond with a JSON array of insights. Example:
[
  {
    "insight_type": "high_point",
    "title": "Breakthrough Understanding of Async Programming",
    "description": "The user had a clear 'aha moment' when the concept of promises was explained through a real-world analogy. This marked a turning point in their understanding.",
    "confidence_score": 0.9
  }
]

Be specific, reference actual moments from the conversation, and provide genuinely useful insights.
Respond ONLY with the JSON array, no additional text.`;

    const response = await callGrokAPI([
      { role: 'system', content: 'You are an expert conversation analyst specializing in deep insights. Respond only with valid JSON.' },
      { role: 'user', content: prompt }
    ], 0.4);

    // Parse insights
    const insights = parseInsightsResponse(response);

    return insights;
  } catch (error) {
    console.error('Error generating insights:', error);
    return [];
  }
}

/**
 * Batch analyze multiple conversations
 * @param {Array} conversations - Array of conversations
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Array} - Array of analysis results
 */
async function batchAnalyzeConversations(conversations, progressCallback) {
  const results = [];

  for (let i = 0; i < conversations.length; i++) {
    const conversation = conversations[i];

    try {
      // Analyze conversation
      const analysis = await analyzeConversation(conversation);

      // Categorize topics
      const topics = await categorizeTopics(conversation);

      // Generate insights
      const insights = await generateInsights(conversation, conversation.messages);

      results.push({
        conversation,
        analysis,
        topics,
        insights
      });

      // Call progress callback
      if (progressCallback) {
        progressCallback(i + 1, conversations.length);
      }

      // Rate limiting - wait a bit between requests
      if (i < conversations.length - 1) {
        await sleep(500); // 500ms delay between requests
      }
    } catch (error) {
      console.error(`Error analyzing conversation ${conversation.originalId}:`, error);
      results.push({
        conversation,
        error: error.message
      });
    }
  }

  return results;
}

// ============ HELPER FUNCTIONS ============

/**
 * Create a summary of the conversation
 */
function createConversationSummary(conversation) {
  const messages = conversation.messages || [];
  const messageCount = messages.length;

  // Get first few and last few messages for context
  const preview = messages
    .slice(0, 3)
    .map(m => `[${m.role}]: ${m.content.substring(0, 200)}`)
    .join('\n');

  const userMessages = messages.filter(m => m.role === 'user').length;
  const assistantMessages = messages.filter(m => m.role === 'assistant').length;

  return {
    title: conversation.name,
    messageCount,
    userMessages,
    assistantMessages,
    preview,
    firstMessageTime: messages[0]?.timestamp,
    lastMessageTime: messages[messages.length - 1]?.timestamp
  };
}

/**
 * Create analysis prompt
 */
function createAnalysisPrompt(summary) {
  return `Analyze this conversation and provide a comprehensive analysis.

Title: ${summary.title}
Message Count: ${summary.messageCount}
User Messages: ${summary.userMessages}
Assistant Messages: ${summary.assistantMessages}

Preview:
${summary.preview}

Provide analysis in JSON format with these fields:
{
  "summary": "A 2-3 sentence summary of the conversation",
  "main_topics": ["topic1", "topic2", "topic3"],
  "sentiment": "positive|negative|neutral|mixed",
  "complexity_score": 0.0-1.0 (how complex/technical the conversation is)
}

Respond ONLY with valid JSON, no additional text.`;
}

/**
 * Format conversation for analysis
 */
function formatConversationForAnalysis(messages) {
  // Limit to first 50 messages to avoid token limits
  const limitedMessages = messages.slice(0, 50);

  return limitedMessages
    .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
    .join('\n\n---\n\n');
}

/**
 * Call Grok API
 */
async function callGrokAPI(messages, temperature = 0.3) {
  try {
    const response = await axios.post(
      XAI_API_URL,
      {
        model: 'grok-4-fast-reasoning',
        messages: messages,
        temperature: temperature,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${XAI_API_KEY}`
        },
        timeout: 30000 // 30 second timeout
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Grok API error:', error.response?.data || error.message);
    // Re-throw with context preserved
    const errorMessage = error.response?.data?.error?.message || error.message;
    const statusCode = error.response?.status;
    throw new Error(`Failed to call Grok API${statusCode ? ` (${statusCode})` : ''}: ${errorMessage}`);
  }
}

/**
 * Parse analysis response
 */
function parseAnalysisResponse(response) {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      summary: parsed.summary || 'No summary available',
      mainTopics: parsed.main_topics || [],
      sentiment: parsed.sentiment || 'neutral',
      complexityScore: parsed.complexity_score !== undefined ? parsed.complexity_score : 0.5
    };
  } catch (error) {
    console.error('Error parsing analysis response:', error);
    return {
      summary: 'Analysis unavailable',
      mainTopics: [],
      sentiment: 'neutral',
      complexityScore: 0.5
    };
  }
}

/**
 * Parse topics response
 */
function parseTopicsResponse(response) {
  try {
    // Try to extract JSON array from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    return parsed.map(topic => ({
      name: topic.name || 'Untitled Topic',
      description: topic.description || '',
      relevanceScore: !isNaN(parseFloat(topic.relevance_score)) ? parseFloat(topic.relevance_score) : 1.0
    }));
  } catch (error) {
    console.error('Error parsing topics response:', error);
    return [];
  }
}

/**
 * Parse insights response
 */
function parseInsightsResponse(response) {
  try {
    // Try to extract JSON array from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    return parsed.map(insight => ({
      insightType: insight.insight_type || 'meta_insights',
      title: insight.title || 'Untitled Insight',
      description: insight.description || '',
      confidenceScore: !isNaN(parseFloat(insight.confidence_score)) ? parseFloat(insight.confidence_score) : 0.5
    }));
  } catch (error) {
    console.error('Error parsing insights response:', error);
    return [];
  }
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  analyzeConversation,
  categorizeTopics,
  generateInsights,
  batchAnalyzeConversations
};
