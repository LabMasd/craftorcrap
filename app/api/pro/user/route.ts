import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

// GET /api/pro/user - Get or create current user
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()

    // Try to get existing user
    let { data: user } = await supabase
      .from('users')
      .select('*, workspaces(*)')
      .eq('clerk_id', userId)
      .single()

    // If user doesn't exist, create them (backup for webhook failures)
    if (!user) {
      const clerkUser = await currentUser()

      if (!clerkUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Create user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          clerk_id: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
          avatar_url: clerkUser.imageUrl || null,
        })
        .select()
        .single()

      if (userError) {
        console.error('Error creating user:', userError)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      // Create default workspace
      const { error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          owner_id: newUser.id,
          name: 'My Workspace',
          slug: `workspace-${newUser.id.slice(0, 8)}`,
        })

      if (workspaceError) {
        console.error('Error creating workspace:', workspaceError)
      }

      // Fetch user with workspace
      const { data: userWithWorkspace } = await supabase
        .from('users')
        .select('*, workspaces(*)')
        .eq('id', newUser.id)
        .single()

      user = userWithWorkspace
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error in /api/pro/user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
