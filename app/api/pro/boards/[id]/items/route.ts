import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { fetchUrlPreview } from '@/lib/microlink'

// Check if URL is a direct image link
function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico']
  const urlLower = url.toLowerCase()
  return imageExtensions.some(ext => urlLower.includes(ext)) ||
         urlLower.includes('i.pinimg.com') ||
         urlLower.includes('images.unsplash.com') ||
         urlLower.includes('pbs.twimg.com')
}

// GET /api/pro/boards/[id]/items - Get items for a board
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

    // Get items with vote counts
    const { data: items, error } = await supabase
      .from('board_items_with_votes')
      .select('*')
      .eq('board_id', id)
      .order('position', { ascending: true })

    if (error) {
      console.error('Error fetching board items:', error)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    return NextResponse.json(items || [])
  } catch (error) {
    console.error('Error in GET /api/pro/boards/[id]/items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/pro/boards/[id]/items - Add item to board
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { url, title, description } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch URL preview to get thumbnail and metadata
    let preview = {
      title: title || null,
      thumbnail_url: null as string | null,
      dominant_color: null as string | null,
    }

    try {
      // If it's a direct image URL, use it as the preview
      if (isImageUrl(url)) {
        preview = {
          title: title || null,
          thumbnail_url: url,
          dominant_color: null,
        }
      } else {
        const urlPreview = await fetchUrlPreview(url)
        preview = {
          title: title || urlPreview.title,
          thumbnail_url: urlPreview.thumbnail_url,
          dominant_color: urlPreview.dominant_color,
        }
      }
    } catch (err) {
      console.error('Failed to fetch preview:', err)
      // Continue without preview
    }

    // Get next position
    const { data: lastItem } = await supabase
      .from('board_items')
      .select('position')
      .eq('board_id', id)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const nextPosition = (lastItem?.position || 0) + 1

    // Create item with preview data
    const { data: item, error } = await supabase
      .from('board_items')
      .insert({
        board_id: id,
        submitted_by: user.id,
        url,
        title: preview.title,
        preview_image: preview.thumbnail_url,
        dominant_color: preview.dominant_color,
        description: description || null,
        position: nextPosition,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating board item:', error)
      return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error in POST /api/pro/boards/[id]/items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
