import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export const revalidate = 60 // Cache for 60 seconds

const TOPICS = [
  'Design', 'Tech', 'Fashion', 'Architecture', 'Art',
  'Photography', 'Gaming', 'Music', 'Film', 'Other'
]

interface FormattedBoard {
  id: string
  title: string
  description: string | null
  slug: string
  topic: string | null
  allowVoting: boolean
  allowSubmissions: boolean
  followerCount: number
  itemCount: number
  previews: string[]
  createdAt: string
  creator: { name: string; avatar: string | null } | null
  source: 'pro' | 'user'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const topic = searchParams.get('topic')
    const sort = searchParams.get('sort') || 'popular' // popular, recent
    const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = getServiceClient()
    const allBoards: FormattedBoard[] = []

    // 1. Fetch from pro boards table
    let proQuery = supabase
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

    if (topic && TOPICS.includes(topic)) {
      proQuery = proQuery.eq('topic', topic)
    }

    const { data: proBoards } = await proQuery

    // Get pro board item counts & previews
    const proBoardIds = proBoards?.map(b => b.id) || []
    let proItemCounts: Record<string, number> = {}
    let proPreviews: Record<string, string[]> = {}

    if (proBoardIds.length > 0) {
      const { data: counts } = await supabase
        .from('board_items')
        .select('board_id')
        .in('board_id', proBoardIds)

      if (counts) {
        counts.forEach(c => {
          proItemCounts[c.board_id] = (proItemCounts[c.board_id] || 0) + 1
        })
      }

      const { data: items } = await supabase
        .from('board_items')
        .select('board_id, preview_image')
        .in('board_id', proBoardIds)
        .not('preview_image', 'is', null)
        .order('created_at', { ascending: false })

      if (items) {
        items.forEach(item => {
          if (!proPreviews[item.board_id]) proPreviews[item.board_id] = []
          if (proPreviews[item.board_id].length < 4 && item.preview_image) {
            proPreviews[item.board_id].push(item.preview_image)
          }
        })
      }
    }

    // Add pro boards to results
    proBoards?.forEach(board => {
      allBoards.push({
        id: board.id,
        title: board.title,
        description: board.description,
        slug: board.slug || board.share_token,
        topic: board.topic,
        allowVoting: board.allow_voting,
        allowSubmissions: board.allow_submissions,
        followerCount: board.follower_count || 0,
        itemCount: proItemCounts[board.id] || 0,
        previews: proPreviews[board.id] || [],
        createdAt: board.created_at,
        creator: board.users ? {
          name: (board.users as unknown as { name: string }).name,
          avatar: (board.users as unknown as { avatar_url: string }).avatar_url,
        } : null,
        source: 'pro',
      })
    })

    // 2. Fetch from user_boards table (community boards)
    let userQuery = supabase
      .from('user_boards')
      .select('id, name, slug, share_id, topic, visibility, allow_voting, allow_submissions, follower_count, created_at')
      .eq('visibility', 'public')

    if (topic && TOPICS.includes(topic)) {
      userQuery = userQuery.eq('topic', topic)
    }

    const { data: userBoards } = await userQuery

    // Get user board item counts & previews
    const userBoardIds = userBoards?.map(b => b.id) || []
    let userItemCounts: Record<string, number> = {}
    let userPreviews: Record<string, string[]> = {}

    if (userBoardIds.length > 0) {
      const { data: counts } = await supabase
        .from('saved_items')
        .select('board_id')
        .in('board_id', userBoardIds)

      if (counts) {
        counts.forEach(c => {
          if (c.board_id) userItemCounts[c.board_id] = (userItemCounts[c.board_id] || 0) + 1
        })
      }

      // Get previews from saved_items -> submissions
      const { data: items } = await supabase
        .from('saved_items')
        .select('board_id, submissions(thumbnail_url)')
        .in('board_id', userBoardIds)
        .order('created_at', { ascending: false })

      if (items) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items.forEach((item: any) => {
          if (!item.board_id) return
          if (!userPreviews[item.board_id]) userPreviews[item.board_id] = []
          const thumb = item.submissions?.thumbnail_url
          if (userPreviews[item.board_id].length < 4 && thumb) {
            userPreviews[item.board_id].push(thumb)
          }
        })
      }
    }

    // Add user boards to results
    userBoards?.forEach(board => {
      allBoards.push({
        id: board.id,
        title: board.name,
        description: null,
        slug: board.slug || board.share_id,
        topic: board.topic,
        allowVoting: board.allow_voting ?? true,
        allowSubmissions: board.allow_submissions ?? true,
        followerCount: board.follower_count || 0,
        itemCount: userItemCounts[board.id] || 0,
        previews: userPreviews[board.id] || [],
        createdAt: board.created_at,
        creator: null,
        source: 'user',
      })
    })

    // Sort combined results
    if (sort === 'recent') {
      allBoards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else {
      // popular - by follower count, then item count
      allBoards.sort((a, b) => {
        if (b.followerCount !== a.followerCount) return b.followerCount - a.followerCount
        return b.itemCount - a.itemCount
      })
    }

    // Pagination
    const paginatedBoards = allBoards.slice(offset, offset + limit)

    return NextResponse.json({
      boards: paginatedBoards,
      topics: TOPICS,
      total: allBoards.length,
    })
  } catch (error) {
    console.error('Explore error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch boards' },
      { status: 500 }
    )
  }
}
