import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { verifyExtensionToken, getTokenFromHeader } from '@/lib/extension-auth'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// POST /api/extension/vote - Vote on any URL (requires token auth)
export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Verify token
    const authResult = await verifyExtensionToken(token)

    if (!authResult) {
      return NextResponse.json(
        { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
        { status: 401, headers: corsHeaders }
      )
    }

    const userId = authResult.userId
    const { url, imageUrl, verdict } = await request.json()

    if (!url || !verdict) {
      return NextResponse.json(
        { error: 'url and verdict are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (verdict !== 'craft' && verdict !== 'crap') {
      return NextResponse.json(
        { error: 'verdict must be "craft" or "crap"' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getServiceClient()

    // Find or create submission
    let submission
    const { data: existing } = await supabase
      .from('submissions')
      .select('id, total_craft, total_crap')
      .eq('url', url)
      .single()

    if (existing) {
      submission = existing
    } else {
      // Create new submission
      const { data: newSubmission, error: createError } = await supabase
        .from('submissions')
        .insert({
          url,
          thumbnail_url: imageUrl || null,
          submitted_by: userId,
        })
        .select('id, total_craft, total_crap')
        .single()

      if (createError) {
        throw createError
      }
      submission = newSubmission
    }

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id, verdict')
      .eq('submission_id', submission.id)
      .eq('user_id', userId)
      .single()

    if (existingVote) {
      // Already voted - return current state
      return NextResponse.json({
        already_voted: true,
        user_vote: existingVote.verdict,
        total_craft: submission.total_craft,
        total_crap: submission.total_crap,
      }, { headers: corsHeaders })
    }

    // Get IP for rate limiting
    const ip_address =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Cast vote with user_id
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        submission_id: submission.id,
        verdict,
        user_id: userId,
        ip_address,
        fingerprint: `user-${userId}`,
      })

    if (voteError) {
      if (voteError.code === '23505') {
        return NextResponse.json(
          { error: 'Already voted' },
          { status: 409, headers: corsHeaders }
        )
      }
      throw voteError
    }

    // Update totals
    const newCraft = submission.total_craft + (verdict === 'craft' ? 1 : 0)
    const newCrap = submission.total_crap + (verdict === 'crap' ? 1 : 0)

    await supabase
      .from('submissions')
      .update({
        total_craft: newCraft,
        total_crap: newCrap,
      })
      .eq('id', submission.id)

    return NextResponse.json({
      success: true,
      user_vote: verdict,
      total_craft: newCraft,
      total_crap: newCrap,
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Extension vote error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to vote' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// DELETE /api/extension/vote - Remove a vote (undo)
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401, headers: corsHeaders }
      )
    }

    const authResult = await verifyExtensionToken(token)

    if (!authResult) {
      return NextResponse.json(
        { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
        { status: 401, headers: corsHeaders }
      )
    }

    const userId = authResult.userId
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'url is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getServiceClient()

    // Find submission
    const { data: submission } = await supabase
      .from('submissions')
      .select('id, total_craft, total_crap')
      .eq('url', url)
      .single()

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Find user's vote
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id, verdict')
      .eq('submission_id', submission.id)
      .eq('user_id', userId)
      .single()

    if (!existingVote) {
      return NextResponse.json(
        { error: 'No vote to remove' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Delete the vote
    const { error: deleteError } = await supabase
      .from('votes')
      .delete()
      .eq('id', existingVote.id)

    if (deleteError) {
      throw deleteError
    }

    // Update totals
    const newCraft = submission.total_craft - (existingVote.verdict === 'craft' ? 1 : 0)
    const newCrap = submission.total_crap - (existingVote.verdict === 'crap' ? 1 : 0)

    await supabase
      .from('submissions')
      .update({
        total_craft: Math.max(0, newCraft),
        total_crap: Math.max(0, newCrap),
      })
      .eq('id', submission.id)

    return NextResponse.json({
      success: true,
      removed_vote: existingVote.verdict,
      total_craft: Math.max(0, newCraft),
      total_crap: Math.max(0, newCrap),
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Extension vote delete error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove vote' },
      { status: 500, headers: corsHeaders }
    )
  }
}
