import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin'

export async function GET() {
  const { authorized } = await requireAdmin()

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getServiceClient()

    // Get all users with their workspace and board counts
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        *,
        workspaces:workspaces(count),
        boards:boards(count)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Transform the data to flatten counts
    const usersWithStats = users?.map(user => ({
      ...user,
      workspace_count: user.workspaces?.[0]?.count || 0,
      board_count: user.boards?.[0]?.count || 0,
    })) || []

    return NextResponse.json(usersWithStats)
  } catch (error) {
    console.error('Error in admin users route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
