import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { verifyExtensionToken, getTokenFromHeader } from '@/lib/extension-auth'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET /api/extension/boards - Get user's boards
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401, headers: corsHeaders }
      )
    }

    const authResult = await verifyExtensionToken(token)

    if (!authResult) {
      return NextResponse.json(
        { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
        { status: 401, headers: corsHeaders }
      )
    }

    const userId = authResult.userId
    const supabase = getServiceClient()

    const { data: boards, error } = await supabase
      .from('user_boards')
      .select('id, name, icon')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching boards:', error)
      return NextResponse.json(
        { error: 'Failed to fetch boards' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json({ boards: boards || [] }, { headers: corsHeaders })
  } catch (error) {
    console.error('Extension boards error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch boards' },
      { status: 500, headers: corsHeaders }
    )
  }
}
