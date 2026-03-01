-- Add visibility and topic columns to user_boards for public sharing

ALTER TABLE user_boards ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'link', 'public'));
ALTER TABLE user_boards ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE user_boards ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE user_boards ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;

-- Create index for public boards
CREATE INDEX IF NOT EXISTS idx_user_boards_visibility ON user_boards(visibility) WHERE visibility = 'public';

-- Create user_board_follows table
CREATE TABLE IF NOT EXISTS user_board_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  board_id UUID NOT NULL REFERENCES user_boards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, board_id)
);

-- Create index for follows
CREATE INDEX IF NOT EXISTS idx_user_board_follows_board ON user_board_follows(board_id);
CREATE INDEX IF NOT EXISTS idx_user_board_follows_user ON user_board_follows(user_id);

-- Create trigger to update follower count
CREATE OR REPLACE FUNCTION update_user_board_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_boards SET follower_count = follower_count + 1 WHERE id = NEW.board_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_boards SET follower_count = follower_count - 1 WHERE id = OLD.board_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_board_follow_count_trigger ON user_board_follows;
CREATE TRIGGER user_board_follow_count_trigger
AFTER INSERT OR DELETE ON user_board_follows
FOR EACH ROW EXECUTE FUNCTION update_user_board_follower_count();
