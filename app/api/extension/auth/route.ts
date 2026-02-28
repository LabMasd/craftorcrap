import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://craftorcrap.cc',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET /api/extension/auth - Check if user is logged in
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      }, { headers: corsHeaders })
    }

    // Get user details
    const user = await currentUser()

    return NextResponse.json({
      authenticated: true,
      user: {
        id: userId,
        name: user?.firstName || user?.username || 'User',
        email: user?.emailAddresses?.[0]?.emailAddress,
        imageUrl: user?.imageUrl,
      },
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Extension auth check error:', error)
    return NextResponse.json({
      authenticated: false,
      user: null,
      error: 'Failed to check authentication',
    }, { headers: corsHeaders })
  }
}
