import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getServiceClient } from '@/lib/supabase'
import crypto from 'crypto'

// GET /api/extension/token - Get or create extension token for logged-in user
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = getServiceClient()

    // Check if user already has an extension token
    const { data: existing } = await supabase
      .from('extension_tokens')
      .select('token')
      .eq('user_id', userId)
      .single()

    if (existing) {
      const user = await currentUser()
      return NextResponse.json({
        token: existing.token,
        user: {
          id: userId,
          name: user?.firstName || user?.username || 'User',
          imageUrl: user?.imageUrl,
        }
      })
    }

    // Generate new token
    const token = `coc_${crypto.randomBytes(32).toString('hex')}`

    const { error } = await supabase
      .from('extension_tokens')
      .insert({
        user_id: userId,
        token,
      })

    if (error) {
      throw error
    }

    const user = await currentUser()
    return NextResponse.json({
      token,
      user: {
        id: userId,
        name: user?.firstName || user?.username || 'User',
        imageUrl: user?.imageUrl,
      }
    })

  } catch (error) {
    console.error('Extension token error:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}

// POST /api/extension/token - Regenerate token
export async function POST() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = getServiceClient()

    // Generate new token
    const token = `coc_${crypto.randomBytes(32).toString('hex')}`

    // Upsert token
    const { error } = await supabase
      .from('extension_tokens')
      .upsert({
        user_id: userId,
        token,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      throw error
    }

    const user = await currentUser()
    return NextResponse.json({
      token,
      user: {
        id: userId,
        name: user?.firstName || user?.username || 'User',
        imageUrl: user?.imageUrl,
      }
    })

  } catch (error) {
    console.error('Extension token regenerate error:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate token' },
      { status: 500 }
    )
  }
}
