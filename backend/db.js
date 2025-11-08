// Database module for PostgreSQL
// Supports both local development and production (DigitalOcean/Vercel Postgres)

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database connection pool
let pool = null;

// Initialize database connection
function initDatabase() {
  if (pool) {
    return pool;
  }

  const config = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: true }
          : false
      }
    : {
        // Local development settings
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'grok_chat',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      };

  // Validate required credentials for non-DATABASE_URL configurations
  if (!process.env.DATABASE_URL && (!config.user || !config.password)) {
    console.error('❌ Database credentials not configured. Please set DB_USER and DB_PASSWORD environment variables.');
    throw new Error('Database credentials required');
  }

  pool = new Pool(config);

  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
  });

  console.log('✅ Database connection pool initialized');
  return pool;
}

// Run database migrations
async function runMigrations() {
  const pool = initDatabase();

  try {
    // Create migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check which migrations have been applied
    const appliedMigrations = await pool.query(
      'SELECT name FROM migrations ORDER BY id'
    );
    const appliedNames = new Set(appliedMigrations.rows.map(r => r.name));

    // Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    let migrationFiles = [];

    try {
      migrationFiles = await fs.readdir(migrationsDir);
      migrationFiles = migrationFiles.filter(f => f.endsWith('.sql')).sort();
    } catch (err) {
      console.log('ℹ️  No migrations directory found, skipping migrations');
      return;
    }

    // Apply new migrations
    for (const file of migrationFiles) {
      if (!appliedNames.has(file)) {
        console.log(`📦 Applying migration: ${file}`);
        const migrationSQL = await fs.readFile(
          path.join(migrationsDir, file),
          'utf8'
        );

        await pool.query(migrationSQL);
        await pool.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [file]
        );
        console.log(`✅ Migration applied: ${file}`);
      }
    }
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    throw error;
  }
}

// Create tables if they don't exist
async function createTables() {
  const pool = initDatabase();

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        system_prompt TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    `);

    console.log('✅ Database tables created/verified');

    // Run migrations after tables are created
    await runMigrations();
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

// Save a conversation
async function saveConversation(userId, name, systemPrompt, messages) {
  const pool = initDatabase();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Insert conversation
    const conversationResult = await client.query(
      `INSERT INTO conversations (user_id, name, system_prompt, updated_at) 
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
       RETURNING id`,
      [userId, name, systemPrompt]
    );
    
    const conversationId = conversationResult.rows[0].id;

    // Insert messages
    for (const message of messages) {
      await client.query(
        `INSERT INTO messages (conversation_id, role, content, timestamp, metadata) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          conversationId,
          message.role,
          message.content,
          message.timestamp || new Date(),
          message.metadata || {}
        ]
      );
    }

    await client.query('COMMIT');
    return conversationId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Load a conversation
async function loadConversation(conversationId) {
  const pool = initDatabase();
  
  try {
    const conversationResult = await pool.query(
      'SELECT * FROM conversations WHERE id = $1',
      [conversationId]
    );

    if (conversationResult.rows.length === 0) {
      return null;
    }

    const conversation = conversationResult.rows[0];

    const messagesResult = await pool.query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY timestamp ASC',
      [conversationId]
    );

    return {
      id: conversation.id,
      name: conversation.name,
      systemPrompt: conversation.system_prompt,
      messages: messagesResult.rows.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        metadata: m.metadata
      })),
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at
    };
  } catch (error) {
    console.error('Error loading conversation:', error);
    throw error;
  }
}

// List conversations for a user
async function listConversations(userId, limit = 50, offset = 0) {
  const pool = initDatabase();
  
  try {
    const result = await pool.query(
      `SELECT id, name, system_prompt, created_at, updated_at,
              (SELECT COUNT(*) FROM messages WHERE conversation_id = conversations.id) as message_count
       FROM conversations 
       WHERE user_id = $1 
       ORDER BY updated_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  } catch (error) {
    console.error('Error listing conversations:', error);
    throw error;
  }
}

// Delete a conversation
async function deleteConversation(conversationId, userId) {
  const pool = initDatabase();
  
  try {
    const result = await pool.query(
      'DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id',
      [conversationId, userId]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
}

// Update conversation
async function updateConversation(conversationId, userId, updates) {
  const pool = initDatabase();
  
  try {
    const setClause = [];
    const values = [];
    let paramCounter = 1;

    if (updates.name !== undefined) {
      setClause.push(`name = $${paramCounter++}`);
      values.push(updates.name);
    }

    if (updates.systemPrompt !== undefined) {
      setClause.push(`system_prompt = $${paramCounter++}`);
      values.push(updates.systemPrompt);
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(conversationId);
    values.push(userId);

    const query = `UPDATE conversations 
       SET ${setClause.join(', ')} 
       WHERE id = $${paramCounter++} AND user_id = $${paramCounter++}
       RETURNING *`;

    const result = await pool.query(query, values);

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error updating conversation:', error);
    throw error;
  }
}

// Check if database is available
async function checkDatabase() {
  try {
    const pool = initDatabase();
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database check failed:', error);
    return false;
  }
}

// Close database connection
async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Database connection pool closed');
  }
}

// ============ IMPORTS ============

// Create a new import record
async function createImport(userId, filename, fileSize) {
  const pool = initDatabase();

  try {
    const result = await pool.query(
      `INSERT INTO imports (user_id, filename, file_size, status)
       VALUES ($1, $2, $3, 'processing')
       RETURNING *`,
      [userId, filename, fileSize]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating import:', error);
    throw error;
  }
}

// Update import status
async function updateImportStatus(importId, status, totalConversations, processedConversations, errorMessage = null) {
  const pool = initDatabase();

  try {
    const result = await pool.query(
      `UPDATE imports
       SET status = $1, total_conversations = $2, processed_conversations = $3,
           error_message = $4, completed_at = CASE WHEN $1 IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE id = $5
       RETURNING *`,
      [status, totalConversations, processedConversations, errorMessage, importId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error updating import:', error);
    throw error;
  }
}

// List imports for a user
async function listImports(userId, limit = 50) {
  const pool = initDatabase();

  try {
    const result = await pool.query(
      `SELECT * FROM imports WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error listing imports:', error);
    throw error;
  }
}

// ============ TOPICS ============

// Create or get a topic by name
async function createOrGetTopic(name, description = null, color = null, icon = null) {
  const pool = initDatabase();

  try {
    // Try to get existing topic first
    const existingTopic = await pool.query(
      'SELECT * FROM topics WHERE name = $1',
      [name]
    );

    if (existingTopic.rows.length > 0) {
      return existingTopic.rows[0];
    }

    // Create new topic
    const result = await pool.query(
      `INSERT INTO topics (name, description, color, icon)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description, color, icon]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating/getting topic:', error);
    throw error;
  }
}

// Link conversation to topic
async function linkConversationToTopic(conversationId, topicId, relevanceScore = 1.0) {
  const pool = initDatabase();

  try {
    const result = await pool.query(
      `INSERT INTO conversation_topics (conversation_id, topic_id, relevance_score)
       VALUES ($1, $2, $3)
       ON CONFLICT (conversation_id, topic_id) DO UPDATE SET relevance_score = $3
       RETURNING *`,
      [conversationId, topicId, relevanceScore]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error linking conversation to topic:', error);
    throw error;
  }
}

// Get all topics with conversation counts
async function listTopics(userId = null) {
  const pool = initDatabase();

  try {
    let query = `
      SELECT t.*, t.conversation_count
      FROM topics t
      WHERE t.conversation_count > 0
      ORDER BY t.conversation_count DESC, t.name ASC
    `;

    // If userId provided, only get topics for their conversations
    // NOTE: This recalculates per-user topic counts on each request.
    // For better performance with large datasets, consider adding a
    // materialized view or separate per-user count tracking table.
    // Current approach is acceptable for initial deployment.
    if (userId) {
      query = `
        SELECT DISTINCT t.*, COUNT(DISTINCT ct.conversation_id) as conversation_count
        FROM topics t
        JOIN conversation_topics ct ON t.id = ct.topic_id
        JOIN conversations c ON ct.conversation_id = c.id
        WHERE c.user_id = $1
        GROUP BY t.id
        HAVING COUNT(DISTINCT ct.conversation_id) > 0
        ORDER BY conversation_count DESC, t.name ASC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    }

    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error listing topics:', error);
    throw error;
  }
}

// Get conversations by topic
async function getConversationsByTopic(topicId, userId = null, limit = 50, offset = 0) {
  const pool = initDatabase();

  try {
    let query = `
      SELECT c.*, ct.relevance_score,
             (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
      FROM conversations c
      JOIN conversation_topics ct ON c.id = ct.conversation_id
      WHERE ct.topic_id = $1
    `;

    const params = [topicId];

    if (userId) {
      query += ` AND c.user_id = $${params.length + 1}`;
      params.push(userId);
    }

    query += ` ORDER BY ct.relevance_score DESC, c.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error getting conversations by topic:', error);
    throw error;
  }
}

// ============ ANALYSES ============

// Create conversation analysis
async function createAnalysis(conversationId, summary, mainTopics, sentiment, complexityScore) {
  const pool = initDatabase();

  try {
    const result = await pool.query(
      `INSERT INTO conversation_analyses
       (conversation_id, summary, main_topics, sentiment, complexity_score)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (conversation_id) DO UPDATE
       SET summary = $2, main_topics = $3, sentiment = $4,
           complexity_score = $5, analyzed_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [conversationId, summary, mainTopics, sentiment, complexityScore]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating analysis:', error);
    throw error;
  }
}

// Add insight to analysis
async function addInsight(analysisId, insightType, title, description, messageIds = null, confidenceScore = 1.0) {
  const pool = initDatabase();

  try {
    const result = await pool.query(
      `INSERT INTO analysis_insights
       (analysis_id, insight_type, title, description, message_ids, confidence_score)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [analysisId, insightType, title, description, messageIds, confidenceScore]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error adding insight:', error);
    throw error;
  }
}

// Get conversation with analysis
async function getConversationWithAnalysis(conversationId) {
  const pool = initDatabase();

  try {
    // Get conversation
    const conversation = await loadConversation(conversationId);
    if (!conversation) return null;

    // Get analysis
    const analysisResult = await pool.query(
      'SELECT * FROM conversation_analyses WHERE conversation_id = $1',
      [conversationId]
    );

    if (analysisResult.rows.length === 0) {
      return conversation;
    }

    const analysis = analysisResult.rows[0];

    // Get insights
    const insightsResult = await pool.query(
      'SELECT * FROM analysis_insights WHERE analysis_id = $1 ORDER BY confidence_score DESC',
      [analysis.id]
    );

    // Get topics
    const topicsResult = await pool.query(
      `SELECT t.*, ct.relevance_score
       FROM topics t
       JOIN conversation_topics ct ON t.id = ct.topic_id
       WHERE ct.conversation_id = $1
       ORDER BY ct.relevance_score DESC`,
      [conversationId]
    );

    return {
      ...conversation,
      analysis: {
        ...analysis,
        insights: insightsResult.rows
      },
      topics: topicsResult.rows
    };
  } catch (error) {
    console.error('Error getting conversation with analysis:', error);
    throw error;
  }
}

// Import conversation from ChatGPT
async function importChatGPTConversation(importBatchId, userId, conversation, messages, originalId, originalTitle) {
  const pool = initDatabase();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insert conversation with import metadata
    const conversationResult = await client.query(
      `INSERT INTO conversations
       (user_id, name, system_prompt, source, original_id, original_title, import_batch_id, created_at, updated_at)
       VALUES ($1, $2, $3, 'chatgpt-import', $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        conversation.name,
        conversation.systemPrompt || 'Imported from ChatGPT',
        originalId,
        originalTitle,
        importBatchId,
        conversation.createdAt,
        conversation.updatedAt
      ]
    );

    const conversationId = conversationResult.rows[0].id;

    // Insert messages
    for (const message of messages) {
      await client.query(
        `INSERT INTO messages (conversation_id, role, content, timestamp, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          conversationId,
          message.role,
          message.content,
          message.timestamp || new Date(),
          message.metadata || {}
        ]
      );
    }

    await client.query('COMMIT');
    return conversationId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  initDatabase,
  createTables,
  saveConversation,
  loadConversation,
  listConversations,
  deleteConversation,
  updateConversation,
  checkDatabase,
  closeDatabase,
  // Imports
  createImport,
  updateImportStatus,
  listImports,
  // Topics
  createOrGetTopic,
  linkConversationToTopic,
  listTopics,
  getConversationsByTopic,
  // Analyses
  createAnalysis,
  addInsight,
  getConversationWithAnalysis,
  importChatGPTConversation
};
