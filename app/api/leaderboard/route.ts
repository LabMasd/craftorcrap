import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export const revalidate = 60 // Cache for 60 seconds

export async function GET() {
  try {
    const supabase = getServiceClient()

    // Get top voters by total votes cast
    const { data: topVoters, error: votersError } = await supabase
      .from('votes')
      .select('user_id, users!inner(name, image_url)')
      .not('user_id', 'is', null)

    if (votersError) throw votersError

    // Aggregate votes per user
    const userVotes: Record<string, { name: string; imageUrl: string | null; votes: number }> = {}

    for (const vote of topVoters || []) {
      const userId = vote.user_id
      const user = vote.users as { name: string; image_url: string | null }

      if (!userVotes[userId]) {
        userVotes[userId] = {
          name: user.name || 'Anonymous',
          imageUrl: user.image_url,
          votes: 0,
        }
      }
      userVotes[userId].votes++
    }

    // Sort by votes and take top 50
    const leaderboard = Object.entries(userVotes)
      .map(([id, data]) => ({
        id,
        name: data.name,
        imageUrl: data.imageUrl,
        votes: data.votes,
      }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 50)

    // Get total stats
    const { count: totalVotes } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })

    const { count: totalSubmissions } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })

    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      leaderboard,
      stats: {
        totalVotes: totalVotes || 0,
        totalSubmissions: totalSubmissions || 0,
        totalUsers: totalUsers || 0,
      },
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
