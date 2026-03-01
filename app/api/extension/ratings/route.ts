import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { verifyExtensionToken, getTokenFromHeader } from '@/lib/extension-auth'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// POST /api/extension/ratings - Batch fetch ratings for URLs
export async function POST(request: NextRequest) {
  try {
    const { urls } = await request.json()

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: 'urls array is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get user if token provided (optional for viewing)
    let userId: string | null = null
    const authHeader = request.headers.get('Authorization')
    const token = getTokenFromHeader(authHeader)

    if (token) {
      const authResult = await verifyExtensionToken(token)
      if (authResult) {
        userId = authResult.userId
      }
    }

    // Limit to 100 URLs per request
    const limitedUrls = urls.slice(0, 100)

    const supabase = getServiceClient()

    // Fetch submissions for these URLs
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('id, url, total_craft, total_crap, weighted_craft, weighted_crap')
      .in('url', limitedUrls)

    if (error) {
      throw error
    }

    // If logged in, get user's votes
    let userVotes: Record<string, string> = {}

    if (userId && submissions && submissions.length > 0) {
      const submissionIds = submissions.map(s => s.id)
      const idToUrl = Object.fromEntries(submissions.map(s => [s.id, s.url]))

      const { data: votes } = await supabase
        .from('votes')
        .select('submission_id, verdict')
        .eq('user_id', userId)
        .in('submission_id', submissionIds)

      if (votes) {
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
      weighted_percent: number
      user_vote: string | null
    }> = {}

    submissions?.forEach(s => {
      const total = s.total_craft + s.total_crap
      const percent = total > 0 ? Math.round((s.total_craft / total) * 100) : 50

      // Calculate weighted percentage
      const weightedTotal = (s.weighted_craft || 0) + (s.weighted_crap || 0)
      const weightedPercent = weightedTotal > 0
        ? Math.round(((s.weighted_craft || 0) / weightedTotal) * 100)
        : percent

      ratings[s.url] = {
        total_craft: s.total_craft,
        total_crap: s.total_crap,
        percent,
        weighted_percent: weightedPercent,
        user_vote: userVotes[s.url] || null,
      }
    })

    return NextResponse.json({
      ratings,
      authenticated: !!userId,
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Extension ratings error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch ratings' },
      { status: 500, headers: corsHeaders }
    )
  }
}
