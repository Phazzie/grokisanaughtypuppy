-- Migration: Add conversation analysis and topic organization features
-- This extends the existing schema to support:
-- 1. ChatGPT conversation imports
-- 2. Topic categorization
-- 3. AI-powered conversation analysis

-- Add columns to conversations table for imports
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS user_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'grok-chat', -- 'grok-chat' or 'chatgpt-import'
ADD COLUMN IF NOT EXISTS original_id VARCHAR(255), -- Original ID from ChatGPT export
ADD COLUMN IF NOT EXISTS original_title VARCHAR(500), -- Original title from ChatGPT
ADD COLUMN IF NOT EXISTS import_batch_id UUID; -- Links to imports table

-- Create imports table to track file uploads
CREATE TABLE IF NOT EXISTS imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    filename VARCHAR(500) NOT NULL,
    file_size BIGINT,
    status VARCHAR(50) DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    total_conversations INTEGER DEFAULT 0,
    processed_conversations INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create topics table
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(20), -- Hex color for UI display
    icon VARCHAR(50), -- Icon name for UI
    conversation_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create conversation_topics junction table (many-to-many)
CREATE TABLE IF NOT EXISTS conversation_topics (
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    relevance_score DECIMAL(3,2) DEFAULT 1.0, -- 0.0-1.0 confidence score from AI
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, topic_id)
);

-- Create conversation_analyses table
CREATE TABLE IF NOT EXISTS conversation_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    summary TEXT,
    main_topics TEXT[], -- Array of main topics discussed
    sentiment VARCHAR(50), -- 'positive', 'negative', 'neutral', 'mixed'
    complexity_score DECIMAL(3,2), -- 0.0-1.0 scale
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(conversation_id)
);

-- Create analysis_insights table for unconventional insights
CREATE TABLE IF NOT EXISTS analysis_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES conversation_analyses(id) ON DELETE CASCADE,
    insight_type VARCHAR(100) NOT NULL, -- e.g., 'high_point', 'low_point', 'pattern', 'cognitive_style', etc.
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    message_ids UUID[], -- References to specific messages this insight relates to
    confidence_score DECIMAL(3,2), -- 0.0-1.0
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_imports_user_id ON imports(user_id);
CREATE INDEX IF NOT EXISTS idx_imports_status ON imports(status);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source);
CREATE INDEX IF NOT EXISTS idx_conversations_import_batch ON conversations(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_conversation_topics_topic ON conversation_topics(topic_id);
CREATE INDEX IF NOT EXISTS idx_conversation_topics_conversation ON conversation_topics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_analysis_insights_analysis ON analysis_insights(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_insights_type ON analysis_insights(insight_type);

-- Create trigger to update topic conversation_count
CREATE OR REPLACE FUNCTION update_topic_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE topics
        SET conversation_count = conversation_count + 1
        WHERE id = NEW.topic_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE topics
        SET conversation_count = conversation_count - 1
        WHERE id = OLD.topic_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_topic_conversation_count
    AFTER INSERT OR DELETE ON conversation_topics
    FOR EACH ROW
    EXECUTE FUNCTION update_topic_count();

-- Insert some default insight types as reference
COMMENT ON TABLE analysis_insights IS 'Stores various types of insights:
- high_point: Moments of breakthrough or success
- low_point: Challenges or frustrations
- pattern: Recurring themes or behaviors
- cognitive_style: How the user thinks/communicates
- learning_curve: Progress over time
- emotional_arc: Emotional journey
- curiosity_peaks: Moments of high engagement
- knowledge_gaps: Areas where user needed more help
- creative_moments: Innovative or unique ideas
- meta_insights: Insights about the conversation itself';
