import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

// GET /api/user/boards - Get user's boards
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()

    const { data: boards, error } = await supabase
      .from('user_boards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching boards:', error)
      return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 })
    }

    // Get item counts for each board
    const boardIds = boards?.map(b => b.id) || []

    let itemCounts: Record<string, number> = {}

    if (boardIds.length > 0) {
      const { data: counts } = await supabase
        .from('saved_items')
        .select('board_id')
        .eq('user_id', userId)
        .in('board_id', boardIds)

      if (counts) {
        counts.forEach(item => {
          if (item.board_id) {
            itemCounts[item.board_id] = (itemCounts[item.board_id] || 0) + 1
          }
        })
      }
    }

    // Get unsorted count
    const { count: unsortedCount } = await supabase
      .from('saved_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('board_id', null)

    const boardsWithCounts = boards?.map(board => ({
      ...board,
      item_count: itemCounts[board.id] || 0
    })) || []

    return NextResponse.json({
      boards: boardsWithCounts,
      unsorted_count: unsortedCount || 0
    })
  } catch (error) {
    console.error('Error in GET /api/user/boards:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/user/boards - Create a board
export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, icon } = await request.json()

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Generate a unique share_id
    const shareId = Math.random().toString(36).substring(2, 12)

    const { data, error } = await supabase
      .from('user_boards')
      .insert({
        user_id: userId,
        name: name.trim(),
        icon: icon || 'folder',
        share_id: shareId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating board:', error)
      return NextResponse.json({ error: 'Failed to create board' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in POST /api/user/boards:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
