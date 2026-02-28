import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// POST /api/extension/ratings - Batch fetch ratings for URLs
export async function POST(request: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  try {
    const { urls, fingerprint } = await request.json()

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: 'urls array is required' },
        { status: 400, headers }
      )
    }

    // Limit to 100 URLs per request
    const limitedUrls = urls.slice(0, 100)

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch submissions for these URLs
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('id, url, total_craft, total_crap')
      .in('url', limitedUrls)

    if (error) {
      throw error
    }

    // If fingerprint provided, also get user's votes
    let userVotes: Record<string, string> = {}
    if (fingerprint && submissions && submissions.length > 0) {
      const submissionIds = submissions.map(s => s.id)
      const { data: votes } = await supabase
        .from('votes')
        .select('submission_id, verdict')
        .eq('fingerprint', fingerprint)
        .in('submission_id', submissionIds)

      if (votes) {
        const idToUrl = Object.fromEntries(submissions.map(s => [s.id, s.url]))
        votes.forEach(v => {
          userVotes[idToUrl[v.submission_id]] = v.verdict
        })
      }
    }

    // Build ratings map
    const ratings: Record<string, {
      total_craft: number
      total_crap: number
      percent: number
      user_vote: string | null
    }> = {}

    submissions?.forEach(s => {
      const total = s.total_craft + s.total_crap
      const percent = total > 0 ? Math.round((s.total_craft / total) * 100) : 50
      ratings[s.url] = {
        total_craft: s.total_craft,
        total_crap: s.total_crap,
        percent,
        user_vote: userVotes[s.url] || null,
      }
    })

    return NextResponse.json({ ratings }, { headers })

  } catch (error) {
    console.error('Extension ratings error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch ratings' },
      { status: 500, headers }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
