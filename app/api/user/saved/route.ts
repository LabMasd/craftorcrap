import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

// GET /api/user/saved - Get user's saved items
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()

    const { data: savedItems, error } = await supabase
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
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching saved items:', error)
      return NextResponse.json({ error: 'Failed to fetch saved items' }, { status: 500 })
    }

    return NextResponse.json({ items: savedItems || [] })
  } catch (error) {
    console.error('Error in GET /api/user/saved:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/user/saved - Save an item
export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { submission_id } = await request.json()

    if (!submission_id) {
      return NextResponse.json({ error: 'submission_id required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('saved_items')
      .insert({
        user_id: userId,
        submission_id,
      })
      .select()
      .single()

    if (error) {
      // Handle duplicate
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already saved' }, { status: 409 })
      }
      console.error('Error saving item:', error)
      return NextResponse.json({ error: 'Failed to save item' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in POST /api/user/saved:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/user/saved - Unsave an item
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { submission_id } = await request.json()

    if (!submission_id) {
      return NextResponse.json({ error: 'submission_id required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { error } = await supabase
      .from('saved_items')
      .delete()
      .eq('user_id', userId)
      .eq('submission_id', submission_id)

    if (error) {
      console.error('Error unsaving item:', error)
      return NextResponse.json({ error: 'Failed to unsave item' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/user/saved:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
