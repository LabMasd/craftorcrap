import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

// GET /api/user/boards/[id] - Get board with items
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()

    // Get board
    const { data: board, error: boardError } = await supabase
      .from('user_boards')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (boardError || !board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    // Get items in board
    const { data: items, error: itemsError } = await supabase
      .from('saved_items')
      .select(`
        id,
        created_at,
        submissions (
          id,
          url,
          title,
          thumbnail_url,
          total_craft,
          total_crap
        )
      `)
      .eq('user_id', userId)
      .eq('board_id', id)
      .order('created_at', { ascending: false })

    if (itemsError) {
      console.error('Error fetching board items:', itemsError)
    }

    return NextResponse.json({
      board,
      items: items || []
    })
  } catch (error) {
    console.error('Error in GET /api/user/boards/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/user/boards/[id] - Update board
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, icon, allow_voting, allow_submissions } = await request.json()

    const supabase = getServiceClient()

    const updates: Record<string, string | boolean> = {}
    if (name) updates.name = name.trim()
    if (icon) updates.icon = icon
    if (typeof allow_voting === 'boolean') updates.allow_voting = allow_voting
    if (typeof allow_submissions === 'boolean') updates.allow_submissions = allow_submissions

    const { data, error } = await supabase
      .from('user_boards')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating board:', error)
      return NextResponse.json({ error: 'Failed to update board' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PATCH /api/user/boards/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/user/boards/[id] - Delete board
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()

    // Items will have board_id set to null due to ON DELETE SET NULL
    const { error } = await supabase
      .from('user_boards')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting board:', error)
      return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/user/boards/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
