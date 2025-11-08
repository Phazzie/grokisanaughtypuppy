-- Migration: Add performance indexes
-- Created: 2025-11-04
-- Purpose: Optimize common query patterns

-- Index for conversations by user and updated timestamp
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON conversations(user_id, updated_at DESC);

-- Index for messages by conversation and timestamp
CREATE INDEX IF NOT EXISTS idx_messages_conversation_timestamp
  ON messages(conversation_id, timestamp);

-- Index for topics by conversation count (for popular topics)
CREATE INDEX IF NOT EXISTS idx_topics_conversation_count
  ON topics(conversation_count DESC)
  WHERE conversation_count > 0;

-- Index for conversation_topics for quick lookups
CREATE INDEX IF NOT EXISTS idx_conversation_topics_conversation
  ON conversation_topics(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_topics_topic
  ON conversation_topics(topic_id, relevance_score DESC);

-- Index for imports by user
CREATE INDEX IF NOT EXISTS idx_imports_user_created
  ON imports(user_id, created_at DESC);

-- Index for conversation analyses
CREATE INDEX IF NOT EXISTS idx_analyses_conversation
  ON conversation_analyses(conversation_id);

-- Composite index for conversation search by user and source
CREATE INDEX IF NOT EXISTS idx_conversations_user_source
  ON conversations(user_id, source, updated_at DESC);

-- Index for message role filtering (if needed)
CREATE INDEX IF NOT EXISTS idx_messages_role
  ON messages(role)
  WHERE role IN ('user', 'assistant');

ANALYZE conversations;
ANALYZE messages;
ANALYZE topics;
ANALYZE conversation_topics;
ANALYZE imports;
ANALYZE conversation_analyses;
