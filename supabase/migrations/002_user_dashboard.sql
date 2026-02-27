-- Add user_id to votes table (for logged-in users)
ALTER TABLE votes ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Add user_id to submissions table (for tracking who submitted)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Create saved_items table
CREATE TABLE IF NOT EXISTS saved_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, submission_id)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_submission_id ON saved_items(submission_id);

-- Enable RLS on saved_items
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own saved items
CREATE POLICY "Users can view own saved items" ON saved_items
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own saved items" ON saved_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own saved items" ON saved_items
  FOR DELETE USING (true);
