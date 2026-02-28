import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { verifyExtensionToken, getTokenFromHeader } from '@/lib/extension-auth'
import { fetchUrlPreview } from '@/lib/microlink'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Verify token
    const authResult = await verifyExtensionToken(token)

    if (!authResult) {
      return NextResponse.json(
        { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
        { status: 401, headers: corsHeaders }
      )
    }

    const userId = authResult.userId
    const { url, imageUrl, category } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getServiceClient()

    // Check if URL already exists
    const { data: existing } = await supabase
      .from('submissions')
      .select('id')
      .eq('url', url)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'This URL has already been submitted' },
        { status: 409, headers: corsHeaders }
      )
    }

    // Try to get preview data, but use the provided image as fallback
    let title: string | null = null
    let thumbnailUrl: string | null = imageUrl || null
    let dominantColor: string | null = null

    try {
      const preview = await fetchUrlPreview(url)
      title = preview.title
      thumbnailUrl = imageUrl || preview.thumbnail_url
      dominantColor = preview.dominant_color
    } catch {
      console.log('Preview fetch failed, using provided data')
    }

    // Insert submission with user ID
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        url,
        title,
        thumbnail_url: thumbnailUrl,
        dominant_color: dominantColor,
        category: category || null,
        submitted_by: userId,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { success: true, id: data.id },
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Extension submit error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit' },
      { status: 500, headers: corsHeaders }
    )
  }
}
