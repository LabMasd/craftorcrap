import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')
  const adminSecret = process.env.ADMIN_SECRET

  if (!adminSecret || key !== adminSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
