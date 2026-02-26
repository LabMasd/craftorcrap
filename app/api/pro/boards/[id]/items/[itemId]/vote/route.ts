import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

// POST /api/pro/boards/[id]/items/[itemId]/vote - Vote on an item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: boardId, itemId } = await params
    const { userId } = await auth()
    const { verdict, voterToken } = await request.json()

    if (!verdict || !['craft', 'crap'].includes(verdict)) {
      return NextResponse.json({ error: 'Invalid verdict' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Check if board allows anonymous votes
    const { data: board } = await supabase
      .from('boards')
      .select('allow_anonymous_votes')
      .eq('id', boardId)
      .single()

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    // If not logged in and board doesn't allow anonymous votes
    if (!userId && !board.allow_anonymous_votes) {
      return NextResponse.json({ error: 'Login required to vote' }, { status: 401 })
    }

    // Get user id if logged in
    let dbUserId = null
    if (userId) {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single()
      dbUserId = user?.id
    }

    // Check for existing vote
    let existingVoteQuery = supabase
      .from('board_votes')
      .select('id, verdict')
      .eq('board_item_id', itemId)

    if (dbUserId) {
      existingVoteQuery = existingVoteQuery.eq('user_id', dbUserId)
    } else if (voterToken) {
      existingVoteQuery = existingVoteQuery.eq('voter_token', voterToken)
    } else {
      return NextResponse.json({ error: 'Voter identification required' }, { status: 400 })
    }

    const { data: existingVote } = await existingVoteQuery.single()

    if (existingVote) {
      // Update existing vote
      const { data: vote, error } = await supabase
        .from('board_votes')
        .update({ verdict })
        .eq('id', existingVote.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating vote:', error)
        return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 })
      }

      return NextResponse.json(vote)
    } else {
      // Create new vote
      const { data: vote, error } = await supabase
        .from('board_votes')
        .insert({
          board_item_id: itemId,
          user_id: dbUserId,
          voter_token: !dbUserId ? voterToken : null,
          verdict,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating vote:', error)
        return NextResponse.json({ error: 'Failed to create vote' }, { status: 500 })
      }

      return NextResponse.json(vote)
    }
  } catch (error) {
    console.error('Error in POST /api/pro/boards/[id]/items/[itemId]/vote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
