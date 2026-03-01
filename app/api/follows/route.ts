import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { verifyExtensionToken, getTokenFromHeader } from '@/lib/extension-auth'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET /api/follows - Get users the current user follows
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      )
    }

    const authResult = await verifyExtensionToken(token)
    if (!authResult) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      )
    }

    const supabase = getServiceClient()

    // Get list of users this user follows
    const { data: follows, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', authResult.userId)

    if (error) throw error

    // Get user details for each followed user
    const followingIds = follows?.map(f => f.following_id) || []

    if (followingIds.length === 0) {
      return NextResponse.json({ following: [] }, { headers: corsHeaders })
    }

    const { data: users } = await supabase
      .from('users')
      .select('clerk_id, name, avatar_url')
      .in('clerk_id', followingIds)

    const following = users?.map(u => ({
      id: u.clerk_id,
      name: u.name,
      imageUrl: u.avatar_url,
    })) || []

    return NextResponse.json({ following }, { headers: corsHeaders })
  } catch (error) {
    console.error('Get follows error:', error)
    return NextResponse.json(
      { error: 'Failed to get follows' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// POST /api/follows - Follow a user
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      )
    }

    const authResult = await verifyExtensionToken(token)
    if (!authResult) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      )
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Can't follow yourself
    if (userId === authResult.userId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getServiceClient()

    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: authResult.userId,
        following_id: userId,
      })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Already following' },
          { status: 409, headers: corsHeaders }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error('Follow error:', error)
    return NextResponse.json(
      { error: 'Failed to follow' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// DELETE /api/follows - Unfollow a user
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      )
    }

    const authResult = await verifyExtensionToken(token)
    if (!authResult) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      )
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getServiceClient()

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', authResult.userId)
      .eq('following_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error('Unfollow error:', error)
    return NextResponse.json(
      { error: 'Failed to unfollow' },
      { status: 500, headers: corsHeaders }
    )
  }
}
