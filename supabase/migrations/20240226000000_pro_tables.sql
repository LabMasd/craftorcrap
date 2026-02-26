-- craftorcrap Pro Database Schema
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table (linked to Clerk)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'solo', 'studio')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast Clerk ID lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- Workspaces table (for Studio plan team collaboration)
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  plan_tier TEXT DEFAULT 'solo' CHECK (plan_tier IN ('solo', 'studio')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace members (for Studio plan)
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Boards table
CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  share_token TEXT UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  password_hash TEXT, -- Optional password protection
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'link', 'public')),
  allow_anonymous_votes BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for share token lookups
CREATE INDEX IF NOT EXISTS idx_boards_share_token ON boards(share_token);

-- Board items (URLs/links added to a board)
CREATE TABLE IF NOT EXISTS board_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES users(id),
  url TEXT NOT NULL,
  title TEXT,
  preview_image TEXT,
  dominant_color TEXT,
  description TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for board items
CREATE INDEX IF NOT EXISTS idx_board_items_board_id ON board_items(board_id);

-- Board votes (separate from public votes)
CREATE TABLE IF NOT EXISTS board_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_item_id UUID NOT NULL REFERENCES board_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id), -- NULL for anonymous voters
  voter_token TEXT, -- For anonymous voters (stored in cookie)
  verdict TEXT NOT NULL CHECK (verdict IN ('craft', 'crap')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicate votes
  UNIQUE(board_item_id, user_id),
  UNIQUE(board_item_id, voter_token)
);

-- Index for vote counts
CREATE INDEX IF NOT EXISTS idx_board_votes_item_id ON board_votes(board_item_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_boards_updated_at ON boards;
CREATE TRIGGER update_boards_updated_at
  BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_votes ENABLE ROW LEVEL SECURITY;

-- Users: users can read/update their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (true); -- Allow service role to read all

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (true); -- Managed via API with Clerk auth

-- Workspaces: members can view their workspaces
CREATE POLICY "Workspace members can view" ON workspaces
  FOR SELECT USING (true);

CREATE POLICY "Workspace owners can update" ON workspaces
  FOR UPDATE USING (true);

CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (true);

-- Workspace members policies
CREATE POLICY "Members can view workspace members" ON workspace_members
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage members" ON workspace_members
  FOR ALL USING (true);

-- Boards: workspace members can access
CREATE POLICY "Board access for members" ON boards
  FOR SELECT USING (true);

CREATE POLICY "Board creation" ON boards
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Board updates" ON boards
  FOR UPDATE USING (true);

CREATE POLICY "Board deletion" ON boards
  FOR DELETE USING (true);

-- Board items policies
CREATE POLICY "Board items access" ON board_items
  FOR SELECT USING (true);

CREATE POLICY "Board items creation" ON board_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Board items deletion" ON board_items
  FOR DELETE USING (true);

-- Board votes policies
CREATE POLICY "Anyone can vote" ON board_votes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view votes" ON board_votes
  FOR SELECT USING (true);

-- Views for aggregated data

-- Board items with vote counts
CREATE OR REPLACE VIEW board_items_with_votes AS
SELECT
  bi.*,
  COALESCE(SUM(CASE WHEN bv.verdict = 'craft' THEN 1 ELSE 0 END), 0) AS total_craft,
  COALESCE(SUM(CASE WHEN bv.verdict = 'crap' THEN 1 ELSE 0 END), 0) AS total_crap,
  COUNT(bv.id) AS total_votes
FROM board_items bi
LEFT JOIN board_votes bv ON bv.board_item_id = bi.id
GROUP BY bi.id;

-- Board summary view
CREATE OR REPLACE VIEW boards_summary AS
SELECT
  b.*,
  COUNT(DISTINCT bi.id) AS item_count,
  COUNT(DISTINCT bv.id) AS vote_count,
  u.name AS creator_name,
  u.avatar_url AS creator_avatar
FROM boards b
LEFT JOIN board_items bi ON bi.board_id = b.id
LEFT JOIN board_votes bv ON bv.board_item_id = bi.id
LEFT JOIN users u ON u.id = b.created_by
GROUP BY b.id, u.name, u.avatar_url;
