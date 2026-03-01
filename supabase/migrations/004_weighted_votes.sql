-- Add weight column to votes table
ALTER TABLE votes ADD COLUMN IF NOT EXISTS weight DECIMAL(4,2) DEFAULT 1.0;

-- Add weighted totals to submissions
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS weighted_craft DECIMAL(10,2) DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS weighted_crap DECIMAL(10,2) DEFAULT 0;

-- User reputation table
CREATE TABLE IF NOT EXISTS user_reputation (
  user_id TEXT PRIMARY KEY,
  total_votes INTEGER DEFAULT 0,
  accuracy_score DECIMAL(5,2) DEFAULT 50.0, -- % of votes matching consensus
  weight DECIMAL(4,2) DEFAULT 1.0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user reputation
CREATE INDEX IF NOT EXISTS idx_user_reputation_weight ON user_reputation(weight DESC);

-- Function to calculate user weight based on votes
-- Weight formula: 1.0 + (total_votes / 100), capped at 2.0
CREATE OR REPLACE FUNCTION calculate_user_weight(vote_count INTEGER)
RETURNS DECIMAL(4,2) AS $$
BEGIN
  RETURN LEAST(2.0, 1.0 + (vote_count::decimal / 100));
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reputation" ON user_reputation
  FOR SELECT USING (true);

CREATE POLICY "System can update reputation" ON user_reputation
  FOR ALL USING (true);
