import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

// GET /api/pro/boards/[id] - Get a specific board with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()

    // Get board with items
    const { data: board, error } = await supabase
      .from('boards')
      .select(`
        *,
        board_items (
          *,
          board_votes (verdict)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    // Calculate vote counts for each item
    const itemsWithVotes = board.board_items?.map((item: any) => ({
      ...item,
      total_craft: item.board_votes?.filter((v: any) => v.verdict === 'craft').length || 0,
      total_crap: item.board_votes?.filter((v: any) => v.verdict === 'crap').length || 0,
      board_votes: undefined, // Remove raw votes from response
    })) || []

    return NextResponse.json({
      ...board,
      board_items: itemsWithVotes,
    })
  } catch (error) {
    console.error('Error in GET /api/pro/boards/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/pro/boards/[id] - Update a board
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = await request.json()
    const allowedFields = ['title', 'description', 'visibility', 'allow_anonymous_votes', 'is_archived']
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowedFields.includes(key))
    )

    const supabase = getServiceClient()

    const { data: board, error } = await supabase
      .from('boards')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating board:', error)
      return NextResponse.json({ error: 'Failed to update board' }, { status: 500 })
    }

    return NextResponse.json(board)
  } catch (error) {
    console.error('Error in PATCH /api/pro/boards/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/pro/boards/[id] - Delete a board
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()

    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting board:', error)
      return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/pro/boards/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
