import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// POST /api/extension/vote - Quick vote on any URL
// Creates submission if it doesn't exist
export async function POST(request: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  try {
    const { url, imageUrl, verdict, fingerprint } = await request.json()

    if (!url || !verdict || !fingerprint) {
      return NextResponse.json(
        { error: 'url, verdict, and fingerprint are required' },
        { status: 400, headers }
      )
    }

    if (verdict !== 'craft' && verdict !== 'crap') {
      return NextResponse.json(
        { error: 'verdict must be "craft" or "crap"' },
        { status: 400, headers }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

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
          submitted_by: 'extension',
        })
        .select('id, total_craft, total_crap')
        .single()

      if (createError) {
        throw createError
      }
      submission = newSubmission
    }

    // Check if already voted
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id, verdict')
      .eq('submission_id', submission.id)
      .eq('fingerprint', fingerprint)
      .single()

    if (existingVote) {
      // Already voted - return current state
      return NextResponse.json({
        already_voted: true,
        user_vote: existingVote.verdict,
        total_craft: submission.total_craft,
        total_crap: submission.total_crap,
      }, { headers })
    }

    // Cast vote
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        submission_id: submission.id,
        verdict,
        fingerprint,
      })

    if (voteError) {
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
    }, { headers })

  } catch (error) {
    console.error('Extension vote error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to vote' },
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
