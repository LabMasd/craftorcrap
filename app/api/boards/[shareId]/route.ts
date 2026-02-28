import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(
  request: Request,
  { params }: { params: { shareId: string } }
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { shareId } = params

  // Get board by share_id
  const { data: board, error: boardError } = await supabase
    .from('user_boards')
    .select('id, name, share_id, created_at, allow_voting, allow_submissions')
    .eq('share_id', shareId)
    .single()

  if (boardError || !board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  // Get items in this board
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
        dominant_color,
        category,
        total_craft,
        total_crap
      )
    `)
    .eq('board_id', board.id)
    .order('created_at', { ascending: false })

  if (itemsError) {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }

  return NextResponse.json({
    board: {
      name: board.name,
      share_id: board.share_id,
      created_at: board.created_at,
      allow_voting: board.allow_voting ?? true,
      allow_submissions: board.allow_submissions ?? true,
    },
    items: items || [],
  })
}
