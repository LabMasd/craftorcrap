import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET

  if (!appId || !appSecret) {
    return NextResponse.json({ error: 'Meta credentials not configured' }, { status: 500 })
  }

  const accessToken = `${appId}|${appSecret}`

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${accessToken}`
    )

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json({ error: error.error?.message || 'Failed to fetch' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch Instagram data' }, { status: 500 })
  }
}
