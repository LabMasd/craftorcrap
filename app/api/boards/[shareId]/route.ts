import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { shareId } = await params

  // Try user_boards first (legacy)
  let { data: board, error: boardError } = await supabase
    .from('user_boards')
    .select('id, name, share_id, created_at, allow_voting, allow_submissions, visibility, follower_count, topic')
    .eq('share_id', shareId)
    .single()

  let isProBoard = false

  // If not found, try boards table (pro)
  if (boardError || !board) {
    const { data: proBoard, error: proBoardError } = await supabase
      .from('boards')
      .select('id, title, share_token, slug, created_at, allow_voting, allow_submissions, visibility, follower_count, topic')
      .or(`share_token.eq.${shareId},slug.eq.${shareId}`)
      .single()

    if (proBoardError || !proBoard) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    board = {
      id: proBoard.id,
      name: proBoard.title,
      share_id: proBoard.share_token || proBoard.slug,
      created_at: proBoard.created_at,
      allow_voting: proBoard.allow_voting,
      allow_submissions: proBoard.allow_submissions,
      visibility: proBoard.visibility,
      follower_count: proBoard.follower_count,
      topic: proBoard.topic,
    }
    isProBoard = true
  }

  // Get items based on board type
  let items = []

  if (isProBoard) {
    const { data: proItems } = await supabase
      .from('board_items')
      .select(`
        id,
        created_at,
        url,
        title,
        preview_image,
        dominant_color,
        description
      `)
      .eq('board_id', board.id)
      .order('created_at', { ascending: false })

    // Format pro items to match expected structure
    items = (proItems || []).map(item => ({
      id: item.id,
      created_at: item.created_at,
      submissions: {
        id: item.id,
        url: item.url,
        title: item.title,
        thumbnail_url: item.preview_image,
        dominant_color: item.dominant_color,
        category: null,
        total_craft: 0,
        total_crap: 0,
      }
    }))
  } else {
    const { data: legacyItems } = await supabase
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

    items = legacyItems || []
  }

  return NextResponse.json({
    board: {
      name: board.name,
      share_id: board.share_id,
      created_at: board.created_at,
      allow_voting: board.allow_voting ?? true,
      allow_submissions: board.allow_submissions ?? true,
      visibility: board.visibility || 'link',
      follower_count: board.follower_count || 0,
      topic: board.topic || null,
    },
    items,
  })
}
