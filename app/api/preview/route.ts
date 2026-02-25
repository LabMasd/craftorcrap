import { NextRequest, NextResponse } from 'next/server'
import { fetchUrlPreview } from '@/lib/microlink'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    const preview = await fetchUrlPreview(url)

    return NextResponse.json(preview)
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch URL preview' },
      { status: 500 }
    )
  }
}
