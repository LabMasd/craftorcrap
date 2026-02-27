import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

// GET /api/user/submissions - Get user's submissions with stats
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()

    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching submissions:', error)
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
    }

    // Calculate stats for each submission
    const submissionsWithStats = submissions?.map(sub => ({
      ...sub,
      total_votes: sub.total_craft + sub.total_crap,
      craft_percent: sub.total_craft + sub.total_crap > 0
        ? Math.round((sub.total_craft / (sub.total_craft + sub.total_crap)) * 100)
        : 50,
    })) || []

    // Overall stats
    const stats = {
      total_submissions: submissions?.length || 0,
      total_votes_received: submissions?.reduce((acc, s) => acc + s.total_craft + s.total_crap, 0) || 0,
      avg_craft_percent: submissionsWithStats.length > 0
        ? Math.round(submissionsWithStats.reduce((acc, s) => acc + s.craft_percent, 0) / submissionsWithStats.length)
        : 0,
    }

    return NextResponse.json({ submissions: submissionsWithStats, stats })
  } catch (error) {
    console.error('Error in /api/user/submissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
