// ChatGPT Conversation Parser
// Extracts and cleans conversations from ChatGPT JSON exports

/**
 * Parse ChatGPT conversations.json export
 * @param {Object|Array} jsonData - The parsed JSON data from conversations.json
 * @returns {Array} - Array of parsed conversations
 */
function parseChatGPTExport(jsonData) {
  // Handle both array and single object formats
  const conversations = Array.isArray(jsonData) ? jsonData : [jsonData];

  const parsed = [];

  for (const conv of conversations) {
    try {
      const parsedConv = parseConversation(conv);
      if (parsedConv && parsedConv.messages.length > 0) {
        parsed.push(parsedConv);
      }
    } catch (error) {
      console.error(`Error parsing conversation ${conv.id || 'unknown'}:`, error.message);
      // Continue with other conversations
    }
  }

  return parsed;
}

/**
 * Parse a single conversation
 * @param {Object} conversation - Single conversation object
 * @returns {Object} - Parsed conversation with metadata and messages
 */
function parseConversation(conversation) {
  const id = conversation.id || conversation.conversation_id;
  const title = conversation.title || 'Untitled Conversation';
  const createTime = conversation.create_time || conversation.created_at || Date.now() / 1000;
  const updateTime = conversation.update_time || conversation.updated_at || createTime;

  // Extract messages from the mapping structure
  const messages = extractMessagesFromMapping(conversation.mapping || {});

  // Get system prompt if any
  const systemPrompt = extractSystemPrompt(messages);

  return {
    originalId: id,
    originalTitle: title,
    name: cleanTitle(title),
    systemPrompt: systemPrompt || 'Imported from ChatGPT',
    createdAt: new Date(createTime * 1000),
    updatedAt: new Date(updateTime * 1000),
    messages: messages.filter(m => m.role !== 'system'), // Filter out system messages from message list
    metadata: {
      source: 'chatgpt',
      originalCreateTime: createTime,
      originalUpdateTime: updateTime
    }
  };
}

/**
 * Extract messages from ChatGPT's mapping structure
 * @param {Object} mapping - The mapping object containing message nodes
 * @returns {Array} - Array of messages in chronological order
 */
function extractMessagesFromMapping(mapping) {
  if (!mapping || typeof mapping !== 'object') {
    return [];
  }

  // Find the root message (no parent)
  let rootId = null;
  for (const [id, node] of Object.entries(mapping)) {
    if (!node.parent || node.parent === null) {
      rootId = id;
      break;
    }
  }

  if (!rootId) {
    // Fallback: Find the message with the earliest create_time
    // or the one that is not referenced as a child by any other node
    const allParents = new Set();
    const nodeEntries = Object.entries(mapping);

    // Collect all parent references
    for (const [, node] of nodeEntries) {
      if (node.parent) {
        allParents.add(node.parent);
      }
    }

    // Find a node that is not anyone's child and has the earliest timestamp
    let earliestNode = null;
    let earliestTime = Infinity;

    for (const [id, node] of nodeEntries) {
      if (!allParents.has(id)) {
        const createTime = node.message?.create_time || Infinity;
        if (createTime < earliestTime) {
          earliestTime = createTime;
          earliestNode = id;
        }
      }
    }

    rootId = earliestNode || nodeEntries[0]?.[0]; // Ultimate fallback to first entry
  }

  // Traverse the tree following the main conversation thread
  const messages = [];
  let currentId = rootId;
  const visited = new Set();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = mapping[currentId];

    if (!node) break;

    // Extract message data
    const message = extractMessageFromNode(node);
    if (message) {
      messages.push(message);
    }

    // Follow the first child (main conversation thread)
    if (node.children && node.children.length > 0) {
      currentId = node.children[0];
    } else {
      break;
    }
  }

  return messages;
}

/**
 * Extract message data from a mapping node
 * @param {Object} node - Message node from mapping
 * @returns {Object|null} - Parsed message or null if invalid
 */
function extractMessageFromNode(node) {
  if (!node || !node.message) {
    return null;
  }

  const msg = node.message;

  // Get author role
  const role = msg.author?.role || 'unknown';

  // Skip system messages and invalid roles
  if (!['user', 'assistant'].includes(role)) {
    // Store system messages separately for potential system prompt extraction
    if (role === 'system' && msg.content) {
      return {
        role: 'system',
        content: extractContentFromMessage(msg),
        timestamp: msg.create_time ? new Date(msg.create_time * 1000) : new Date()
      };
    }
    return null;
  }

  // Extract content
  const content = extractContentFromMessage(msg);

  // Skip empty messages
  if (!content || content.trim().length === 0) {
    return null;
  }

  // Clean the content
  const cleanedContent = cleanMessageContent(content);

  return {
    role: role,
    content: cleanedContent,
    timestamp: msg.create_time ? new Date(msg.create_time * 1000) : new Date(),
    metadata: {
      messageId: msg.id,
      author: msg.author,
      weight: msg.weight,
      endTurn: msg.end_turn
    }
  };
}

/**
 * Extract content from message object
 * @param {Object} message - Message object
 * @returns {string} - Extracted content
 */
function extractContentFromMessage(message) {
  if (!message.content) {
    return '';
  }

  // Handle different content formats
  if (typeof message.content === 'string') {
    return message.content;
  }

  // Handle content with parts array
  if (message.content.parts && Array.isArray(message.content.parts)) {
    return message.content.parts
      .filter(part => typeof part === 'string')
      .join('\n\n');
  }

  // Handle text content type
  if (message.content.content_type === 'text' && message.content.text) {
    return message.content.text;
  }

  return '';
}

/**
 * Extract system prompt from messages
 * @param {Array} messages - Array of messages
 * @returns {string|null} - System prompt or null
 */
function extractSystemPrompt(messages) {
  const systemMessage = messages.find(m => m.role === 'system');
  return systemMessage ? systemMessage.content : null;
}

/**
 * Clean message content by removing formatting artifacts
 * @param {string} content - Raw message content
 * @returns {string} - Cleaned content
 */
function cleanMessageContent(content) {
  if (!content) return '';

  let cleaned = content;

  // Remove markdown artifacts that are just formatting
  // Keep actual code blocks and formatting that adds meaning

  // Remove excessive newlines (more than 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim whitespace
  cleaned = cleaned.trim();

  // Remove any null bytes or other control characters
  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return cleaned;
}

/**
 * Clean conversation title
 * @param {string} title - Raw title
 * @returns {string} - Cleaned title
 */
function cleanTitle(title) {
  if (!title) return 'Untitled Conversation';

  let cleaned = title.trim();

  // Limit length
  if (cleaned.length > 255) {
    cleaned = cleaned.substring(0, 252) + '...';
  }

  return cleaned;
}

/**
 * Validate parsed conversation
 * @param {Object} conversation - Parsed conversation
 * @returns {boolean} - Whether the conversation is valid
 */
function validateConversation(conversation) {
  if (!conversation) return false;
  if (!conversation.name || conversation.name.trim().length === 0) return false;
  if (!conversation.messages || conversation.messages.length === 0) return false;

  // Check that messages have required fields
  for (const msg of conversation.messages) {
    if (!msg.role || !msg.content) return false;
    if (!['user', 'assistant'].includes(msg.role)) return false;
  }

  return true;
}

/**
 * Get conversation statistics
 * @param {Object} conversation - Parsed conversation
 * @returns {Object} - Statistics about the conversation
 */
function getConversationStats(conversation) {
  const messages = conversation.messages || [];

  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');

  const totalWords = messages.reduce((sum, msg) => {
    return sum + (msg.content ? msg.content.split(/\s+/).length : 0);
  }, 0);

  const avgWordsPerMessage = messages.length > 0 ? Math.round(totalWords / messages.length) : 0;

  return {
    totalMessages: messages.length,
    userMessages: userMessages.length,
    assistantMessages: assistantMessages.length,
    totalWords: totalWords,
    avgWordsPerMessage: avgWordsPerMessage,
    duration: conversation.updatedAt - conversation.createdAt,
    hasSystemPrompt: !!conversation.systemPrompt
  };
}

module.exports = {
  parseChatGPTExport,
  parseConversation,
  validateConversation,
  getConversationStats,
  extractMessagesFromMapping,
  cleanMessageContent,
  cleanTitle
};
