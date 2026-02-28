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

// POST /api/extension/save - Save an item to a board
export async function POST(request: NextRequest) {
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
    const { url, board_id } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getServiceClient()

    // Find the submission by URL
    const { data: submission, error: findError } = await supabase
      .from('submissions')
      .select('id')
      .eq('url', url)
      .single()

    if (findError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found. Vote on it first.' },
        { status: 404, headers: corsHeaders }
      )
    }

    // If board_id is provided, verify it belongs to user
    if (board_id) {
      const { data: board } = await supabase
        .from('user_boards')
        .select('id')
        .eq('id', board_id)
        .eq('user_id', userId)
        .single()

      if (!board) {
        return NextResponse.json(
          { error: 'Board not found' },
          { status: 404, headers: corsHeaders }
        )
      }
    }

    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_items')
      .select('id')
      .eq('user_id', userId)
      .eq('submission_id', submission.id)
      .single()

    if (existing) {
      // Update the board if different
      const { error: updateError } = await supabase
        .from('saved_items')
        .update({ board_id: board_id || null })
        .eq('id', existing.id)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json(
        { success: true, updated: true },
        { headers: corsHeaders }
      )
    }

    // Save the item
    const { error: saveError } = await supabase
      .from('saved_items')
      .insert({
        user_id: userId,
        submission_id: submission.id,
        board_id: board_id || null,
      })

    if (saveError) {
      throw saveError
    }

    return NextResponse.json(
      { success: true, saved: true },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Extension save error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save' },
      { status: 500, headers: corsHeaders }
    )
  }
}
