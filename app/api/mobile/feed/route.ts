import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { verifyExtensionToken, getTokenFromHeader } from '@/lib/extension-auth'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET /api/mobile/feed - Get submissions to vote on
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = getTokenFromHeader(authHeader)

    let userId: string | null = null

    if (token) {
      const authResult = await verifyExtensionToken(token)
      if (authResult) {
        userId = authResult.userId
      }
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')
    const category = searchParams.get('category')

    const supabase = getServiceClient()

    // Get submissions the user hasn't voted on yet
    let query = supabase
      .from('submissions')
      .select('id, url, title, thumbnail_url, dominant_color, category, total_craft, total_crap, created_at')
      .not('thumbnail_url', 'is', null)
      .order('created_at', { ascending: false })

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // If user is logged in, exclude submissions they've already voted on
    if (userId) {
      const { data: votedIds } = await supabase
        .from('votes')
        .select('submission_id')
        .eq('user_id', userId)

      if (votedIds && votedIds.length > 0) {
        const ids = votedIds.map(v => v.submission_id)
        query = query.not('id', 'in', `(${ids.join(',')})`)
      }
    }

    const { data: submissions, error } = await query
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({
      submissions: submissions || [],
      hasMore: (submissions?.length || 0) === limit,
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Mobile feed error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feed' },
      { status: 500, headers: corsHeaders }
    )
  }
}
