import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

// GET /api/pro/boards - List user's boards
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Get user's workspaces
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)

    if (!workspaces || workspaces.length === 0) {
      return NextResponse.json([])
    }

    const workspaceIds = workspaces.map(w => w.id)

    // Get boards from boards_summary view
    const { data: boards, error } = await supabase
      .from('boards_summary')
      .select('*')
      .in('workspace_id', workspaceIds)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching boards:', error)
      return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 })
    }

    return NextResponse.json(boards || [])
  } catch (error) {
    console.error('Error in GET /api/pro/boards:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/pro/boards - Create a new board
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, visibility = 'link' } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, plan')
      .eq('clerk_id', userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Check board limit for free users
    if (user.plan === 'free') {
      const { count } = await supabase
        .from('boards')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)
        .eq('is_archived', false)

      if (count && count >= 1) {
        return NextResponse.json(
          { error: 'Free plan limited to 1 board. Upgrade to Pro for unlimited boards.' },
          { status: 403 }
        )
      }
    }

    // Create board
    const { data: board, error } = await supabase
      .from('boards')
      .insert({
        workspace_id: workspace.id,
        created_by: user.id,
        title,
        description,
        visibility,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating board:', error)
      return NextResponse.json({ error: 'Failed to create board' }, { status: 500 })
    }

    return NextResponse.json(board)
  } catch (error) {
    console.error('Error in POST /api/pro/boards:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
