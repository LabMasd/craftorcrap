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
