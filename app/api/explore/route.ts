import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export const revalidate = 60 // Cache for 60 seconds

const TOPICS = [
  'Design', 'UI/UX', 'Branding', 'Motion', '3D',
  'Photography', 'Illustration', 'Architecture',
  'TV Shows', 'Movies', 'Music', 'Albums',
  'Tech', 'Products', 'Fashion', 'Food', 'Other'
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const topic = searchParams.get('topic')
    const sort = searchParams.get('sort') || 'popular' // popular, recent, active
    const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = getServiceClient()

    // Build query for public boards
    let query = supabase
      .from('boards')
      .select(`
        id,
        title,
        description,
        slug,
        share_token,
        topic,
        visibility,
        allow_voting,
        allow_submissions,
        follower_count,
        created_at,
        created_by,
        users!boards_created_by_fkey (name, avatar_url)
      `)
      .eq('visibility', 'public')
      .eq('is_archived', false)

    // Filter by topic if specified
    if (topic && TOPICS.includes(topic)) {
      query = query.eq('topic', topic)
    }

    // Sort
    if (sort === 'recent') {
      query = query.order('created_at', { ascending: false })
    } else if (sort === 'active') {
      query = query.order('updated_at', { ascending: false })
    } else {
      // popular - by follower count
      query = query.order('follower_count', { ascending: false })
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: boards, error } = await query

    if (error) throw error

    // Get item counts for each board
    const boardIds = boards?.map(b => b.id) || []

    let itemCounts: Record<string, number> = {}
    if (boardIds.length > 0) {
      const { data: counts } = await supabase
        .from('board_items')
        .select('board_id')
        .in('board_id', boardIds)

      if (counts) {
        counts.forEach(c => {
          itemCounts[c.board_id] = (itemCounts[c.board_id] || 0) + 1
        })
      }
    }

    // Get preview images (first 4 items per board)
    let previews: Record<string, string[]> = {}
    if (boardIds.length > 0) {
      const { data: items } = await supabase
        .from('board_items')
        .select('board_id, preview_image')
        .in('board_id', boardIds)
        .not('preview_image', 'is', null)
        .order('created_at', { ascending: false })

      if (items) {
        items.forEach(item => {
          if (!previews[item.board_id]) {
            previews[item.board_id] = []
          }
          if (previews[item.board_id].length < 4 && item.preview_image) {
            previews[item.board_id].push(item.preview_image)
          }
        })
      }
    }

    // Format response
    const formattedBoards = boards?.map(board => ({
      id: board.id,
      title: board.title,
      description: board.description,
      slug: board.slug || board.share_token,
      topic: board.topic,
      allowVoting: board.allow_voting,
      allowSubmissions: board.allow_submissions,
      followerCount: board.follower_count || 0,
      itemCount: itemCounts[board.id] || 0,
      previews: previews[board.id] || [],
      createdAt: board.created_at,
      creator: board.users ? {
        name: (board.users as { name: string }).name,
        avatar: (board.users as { avatar_url: string }).avatar_url,
      } : null,
    })) || []

    return NextResponse.json({
      boards: formattedBoards,
      topics: TOPICS,
      total: formattedBoards.length,
    })
  } catch (error) {
    console.error('Explore error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch boards' },
      { status: 500 }
    )
  }
}
