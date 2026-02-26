export interface Submission {
  id: string
  url: string
  title: string | null
  thumbnail_url: string | null
  category: string | null
  dominant_color: string | null
  submitted_by: string | null
  total_craft: number
  total_crap: number
  created_at: string
}

export interface Vote {
  id: string
  submission_id: string
  fingerprint: string
  ip_address: string | null
  verdict: 'craft' | 'crap'
  created_at: string
}

export type Verdict = 'craft' | 'crap'

export type Category = 'Web' | 'Apps' | 'Branding' | 'Graphic Design' | 'Motion' | 'Illustration' | 'Photography' | 'Product' | '3D' | 'AI' | 'Other'

export const CATEGORIES: Category[] = ['Web', 'Apps', 'Branding', 'Graphic Design', 'Motion', 'Illustration', 'Photography', 'Product', '3D', 'AI', 'Other']

export type SortOption = 'most_voted' | 'most_recent' | 'most_craft' | 'most_crap'

// Pro tier types
export type PlanTier = 'free' | 'solo' | 'studio'
export type WorkspaceRole = 'admin' | 'member'
export type BoardVisibility = 'private' | 'link' | 'public'

export interface User {
  id: string
  clerk_id: string
  email: string
  name: string | null
  avatar_url: string | null
  plan: PlanTier
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  owner_id: string
  name: string
  slug: string | null
  plan_tier: PlanTier
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  created_at: string
}

export interface Board {
  id: string
  workspace_id: string
  created_by: string
  title: string
  description: string | null
  share_token: string
  password_hash: string | null
  visibility: BoardVisibility
  allow_anonymous_votes: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface BoardItem {
  id: string
  board_id: string
  submitted_by: string | null
  url: string
  title: string | null
  preview_image: string | null
  dominant_color: string | null
  description: string | null
  position: number
  created_at: string
}

export interface BoardVote {
  id: string
  board_item_id: string
  user_id: string | null
  voter_token: string | null
  verdict: Verdict
  created_at: string
}

// Extended types with aggregated data
export interface BoardItemWithVotes extends BoardItem {
  total_craft: number
  total_crap: number
  total_votes: number
}

export interface BoardSummary extends Board {
  item_count: number
  vote_count: number
  creator_name: string | null
  creator_avatar: string | null
}

export interface Database {
  public: {
    Tables: {
      submissions: {
        Row: Submission
        Insert: {
          id?: string
          url: string
          title?: string | null
          thumbnail_url?: string | null
          category?: string | null
          submitted_by?: string | null
          total_craft?: number
          total_crap?: number
          created_at?: string
        }
        Update: {
          id?: string
          url?: string
          title?: string | null
          thumbnail_url?: string | null
          category?: string | null
          submitted_by?: string | null
          total_craft?: number
          total_crap?: number
          created_at?: string
        }
        Relationships: []
      }
      votes: {
        Row: Vote
        Insert: {
          id?: string
          submission_id: string
          fingerprint: string
          verdict: 'craft' | 'crap'
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          fingerprint?: string
          verdict?: 'craft' | 'crap'
          ip_address?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_submission_id_fkey"
            columns: ["submission_id"]
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
