import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getServiceClient } from '@/lib/supabase'

// POST /api/boards/[token]/vote - Vote on a board item (public)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { itemId, verdict, voterToken } = await request.json()
    const { userId } = await auth()

    if (!itemId || !verdict || !['craft', 'crap'].includes(verdict)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Get board by share token
    const { data: board } = await supabase
      .from('boards')
      .select('id, visibility, allow_anonymous_votes')
      .eq('share_token', token)
      .single()

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    if (board.visibility === 'private') {
      return NextResponse.json({ error: 'This board is private' }, { status: 403 })
    }

    // Check if anonymous votes are allowed
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

    // Need either user id or voter token
    if (!dbUserId && !voterToken) {
      return NextResponse.json({ error: 'Voter identification required' }, { status: 400 })
    }

    // Check for existing vote
    let existingVoteQuery = supabase
      .from('board_votes')
      .select('id, verdict')
      .eq('board_item_id', itemId)

    if (dbUserId) {
      existingVoteQuery = existingVoteQuery.eq('user_id', dbUserId)
    } else {
      existingVoteQuery = existingVoteQuery.eq('voter_token', voterToken)
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
    console.error('Error in POST /api/boards/[token]/vote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
