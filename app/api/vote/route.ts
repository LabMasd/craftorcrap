import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getServiceClient } from '@/lib/supabase'
import type { Verdict } from '@/types'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const { submission_id, verdict, fingerprint } = await request.json()

    if (!submission_id || !verdict || !fingerprint) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get user_id if logged in (optional)
    let user_id: string | null = null
    try {
      const { userId } = await auth()
      user_id = userId
    } catch {
      // Not logged in, that's fine
    }

    if (verdict !== 'craft' && verdict !== 'crap') {
      return NextResponse.json(
        { error: 'Invalid verdict' },
        { status: 400, headers: corsHeaders }
      )
    }

    const ip_address =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const supabase = getServiceClient()

    // Check for existing vote by fingerprint
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('submission_id', submission_id)
      .eq('fingerprint', fingerprint)
      .single()

    if (existingVote) {
      return NextResponse.json(
        { error: 'Already voted' },
        { status: 409, headers: corsHeaders }
      )
    }

    // Secondary check by IP address (looser - allows some duplicates but catches most abuse)
    const { data: ipVotes } = await supabase
      .from('votes')
      .select('id')
      .eq('submission_id', submission_id)
      .eq('ip_address', ip_address)

    if (ipVotes && ipVotes.length >= 3) {
      return NextResponse.json(
        { error: 'Too many votes from this location' },
        { status: 429, headers: corsHeaders }
      )
    }

    // Insert vote
    const { error: voteError } = await supabase.from('votes').insert({
      submission_id,
      verdict: verdict as Verdict,
      fingerprint,
      ip_address,
      user_id,
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

    // Update submission counts
    const column = verdict === 'craft' ? 'total_craft' : 'total_crap'

    const { data: submission, error: updateError } = await supabase
      .from('submissions')
      .select('total_craft, total_crap')
      .eq('id', submission_id)
      .single()

    if (updateError || !submission) {
      throw new Error('Failed to get submission')
    }

    const newCount = (submission[column] || 0) + 1

    const { error: incrementError } = await supabase
      .from('submissions')
      .update({ [column]: newCount })
      .eq('id', submission_id)

    if (incrementError) {
      throw incrementError
    }

    return NextResponse.json({
      total_craft: column === 'total_craft' ? newCount : submission.total_craft,
      total_crap: column === 'total_crap' ? newCount : submission.total_crap,
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json(
      { error: 'Failed to record vote' },
      { status: 500, headers: corsHeaders }
    )
  }
}
