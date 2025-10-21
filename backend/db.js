// Database module for PostgreSQL
// Supports both local development and production (DigitalOcean/Vercel Postgres)

const { Pool } = require('pg');

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
          ? { rejectUnauthorized: false } 
          : false
      }
    : {
        // Local development settings
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'grok_chat',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      };

  pool = new Pool(config);

  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
  });

  console.log('✅ Database connection pool initialized');
  return pool;
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

module.exports = {
  initDatabase,
  createTables,
  saveConversation,
  loadConversation,
  listConversations,
  deleteConversation,
  updateConversation,
  checkDatabase,
  closeDatabase
};
