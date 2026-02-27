import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

// GET /api/boards/[token] - Get a board by share token (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = getServiceClient()

    // Get board by share token
    const { data: board, error } = await supabase
      .from('boards')
      .select(`
        id,
        title,
        description,
        share_token,
        visibility,
        allow_anonymous_votes,
        created_at,
        board_items (
          id,
          url,
          title,
          preview_image,
          dominant_color,
          description,
          position,
          created_at
        )
      `)
      .eq('share_token', token)
      .single()

    if (error || !board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    // Check visibility
    if (board.visibility === 'private') {
      return NextResponse.json({ error: 'This board is private' }, { status: 403 })
    }

    // Get vote counts for each item
    const itemIds = board.board_items?.map((item: { id: string }) => item.id) || []

    let voteCounts: Record<string, { craft: number; crap: number }> = {}

    if (itemIds.length > 0) {
      const { data: votes } = await supabase
        .from('board_votes')
        .select('board_item_id, verdict')
        .in('board_item_id', itemIds)

      // Calculate counts
      voteCounts = (votes || []).reduce((acc: Record<string, { craft: number; crap: number }>, vote: { board_item_id: string; verdict: string }) => {
        if (!acc[vote.board_item_id]) {
          acc[vote.board_item_id] = { craft: 0, crap: 0 }
        }
        if (vote.verdict === 'craft') acc[vote.board_item_id].craft++
        else if (vote.verdict === 'crap') acc[vote.board_item_id].crap++
        return acc
      }, {})
    }

    // Add vote counts to items
    const itemsWithVotes = board.board_items?.map((item: { id: string; position: number }) => ({
      ...item,
      total_craft: voteCounts[item.id]?.craft || 0,
      total_crap: voteCounts[item.id]?.crap || 0,
      total_votes: (voteCounts[item.id]?.craft || 0) + (voteCounts[item.id]?.crap || 0),
    })).sort((a, b) => a.position - b.position) || []

    return NextResponse.json({
      ...board,
      board_items: itemsWithVotes,
    })
  } catch (error) {
    console.error('Error in GET /api/boards/[token]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
