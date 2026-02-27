import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

// GET /api/user/votes - Get user's vote history
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()

    // Get votes with submission details
    const { data: votes, error } = await supabase
      .from('votes')
      .select(`
        id,
        verdict,
        created_at,
        submissions (
          id,
          url,
          title,
          thumbnail_url,
          total_craft,
          total_crap
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching votes:', error)
      return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 })
    }

    // Calculate stats
    const stats = {
      total_votes: votes?.length || 0,
      craft_votes: votes?.filter(v => v.verdict === 'craft').length || 0,
      crap_votes: votes?.filter(v => v.verdict === 'crap').length || 0,
    }

    return NextResponse.json({ votes: votes || [], stats })
  } catch (error) {
    console.error('Error in /api/user/votes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
