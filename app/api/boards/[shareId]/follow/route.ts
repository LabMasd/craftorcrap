import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { auth } from '@clerk/nextjs/server'

// POST - Follow a board
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { shareId } = await params
    const supabase = getServiceClient()

    // Find board by share_token or slug
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id, visibility')
      .or(`share_token.eq.${shareId},slug.eq.${shareId}`)
      .single()

    if (boardError || !board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    // Only allow following public boards
    if (board.visibility !== 'public') {
      return NextResponse.json(
        { error: 'Can only follow public boards' },
        { status: 400 }
      )
    }

    // Create follow
    const { error: followError } = await supabase
      .from('board_follows')
      .insert({
        user_id: userId,
        board_id: board.id,
      })

    if (followError) {
      if (followError.code === '23505') {
        return NextResponse.json({ error: 'Already following' }, { status: 409 })
      }
      throw followError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Follow error:', error)
    return NextResponse.json(
      { error: 'Failed to follow board' },
      { status: 500 }
    )
  }
}

// DELETE - Unfollow a board
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { shareId } = await params
    const supabase = getServiceClient()

    // Find board
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id')
      .or(`share_token.eq.${shareId},slug.eq.${shareId}`)
      .single()

    if (boardError || !board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    // Delete follow
    const { error: unfollowError } = await supabase
      .from('board_follows')
      .delete()
      .eq('user_id', userId)
      .eq('board_id', board.id)

    if (unfollowError) throw unfollowError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unfollow error:', error)
    return NextResponse.json(
      { error: 'Failed to unfollow board' },
      { status: 500 }
    )
  }
}

// GET - Check if user follows this board
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ following: false })
    }

    const { shareId } = await params
    const supabase = getServiceClient()

    // Find board
    const { data: board } = await supabase
      .from('boards')
      .select('id')
      .or(`share_token.eq.${shareId},slug.eq.${shareId}`)
      .single()

    if (!board) {
      return NextResponse.json({ following: false })
    }

    // Check follow
    const { data: follow } = await supabase
      .from('board_follows')
      .select('id')
      .eq('user_id', userId)
      .eq('board_id', board.id)
      .single()

    return NextResponse.json({ following: !!follow })
  } catch {
    return NextResponse.json({ following: false })
  }
}
