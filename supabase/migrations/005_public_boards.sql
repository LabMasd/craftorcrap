-- Public boards feature
-- Boards can be: private, link-only, or public
-- Permissions: view, vote, submit

-- Add new columns to boards
ALTER TABLE boards ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS allow_voting BOOLEAN DEFAULT true;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS allow_submissions BOOLEAN DEFAULT true;

-- Index for public boards browsing
CREATE INDEX IF NOT EXISTS idx_boards_visibility ON boards(visibility) WHERE visibility = 'public';
CREATE INDEX IF NOT EXISTS idx_boards_topic ON boards(topic) WHERE visibility = 'public';
CREATE INDEX IF NOT EXISTS idx_boards_slug ON boards(slug);

-- Board follows table
CREATE TABLE IF NOT EXISTS board_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- clerk_id
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, board_id)
);

-- Indexes for board follows
CREATE INDEX IF NOT EXISTS idx_board_follows_user ON board_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_board_follows_board ON board_follows(board_id);

-- Enable RLS
ALTER TABLE board_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view board follows" ON board_follows
  FOR SELECT USING (true);

CREATE POLICY "Users can follow boards" ON board_follows
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can unfollow boards" ON board_follows
  FOR DELETE USING (true);

-- Function to update follower count
CREATE OR REPLACE FUNCTION update_board_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE boards SET follower_count = follower_count + 1 WHERE id = NEW.board_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE boards SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.board_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for follower count
DROP TRIGGER IF EXISTS board_follow_count_trigger ON board_follows;
CREATE TRIGGER board_follow_count_trigger
  AFTER INSERT OR DELETE ON board_follows
  FOR EACH ROW EXECUTE FUNCTION update_board_follower_count();
