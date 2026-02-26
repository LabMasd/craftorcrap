import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchUrlPreview } from '@/lib/microlink'

export async function POST(request: NextRequest) {
  // Enable CORS for the extension
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  try {
    const { url, imageUrl, category } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400, headers }
      )
    }

    // Check for Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500, headers }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if URL already exists
    const { data: existing } = await supabase
      .from('submissions')
      .select('id')
      .eq('url', url)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'This URL has already been submitted' },
        { status: 409, headers }
      )
    }

    // Try to get preview data, but use the provided image as fallback
    let title: string | null = null
    let thumbnailUrl: string | null = imageUrl || null
    let dominantColor: string | null = null

    try {
      const preview = await fetchUrlPreview(url)
      title = preview.title
      // Use provided imageUrl if available, otherwise use preview thumbnail
      thumbnailUrl = imageUrl || preview.thumbnail_url
      dominantColor = preview.dominant_color
    } catch {
      // If preview fetch fails, just use what we have
      console.log('Preview fetch failed, using provided data')
    }

    // Insert submission
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        url,
        title,
        thumbnail_url: thumbnailUrl,
        dominant_color: dominantColor,
        category: category || null,
        submitted_by: 'extension',
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { success: true, id: data.id },
      { status: 200, headers }
    )
  } catch (error) {
    console.error('Extension submit error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit' },
      { status: 500, headers }
    )
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
