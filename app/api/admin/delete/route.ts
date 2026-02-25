import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { id, key } = await request.json()
    const adminSecret = process.env.ADMIN_SECRET

    if (!adminSecret || key !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing submission ID' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Delete associated votes first
    await supabase
      .from('votes')
      .delete()
      .eq('submission_id', id)

    // Delete the submission
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting submission:', error)
    return NextResponse.json(
      { error: 'Failed to delete submission' },
      { status: 500 }
    )
  }
}
