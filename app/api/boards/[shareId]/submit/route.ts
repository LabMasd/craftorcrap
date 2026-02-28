import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { fetchUrlPreview } from '@/lib/microlink'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(
  request: Request,
  { params }: { params: { shareId: string } }
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { shareId } = params

  try {
    const { url, imageUrl } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Get board by share_id
    const { data: board, error: boardError } = await supabase
      .from('user_boards')
      .select('id, user_id, allow_submissions')
      .eq('share_id', shareId)
      .single()

    if (boardError || !board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    // Check if submissions are allowed
    if (board.allow_submissions === false) {
      return NextResponse.json({ error: 'Submissions are disabled for this board' }, { status: 403 })
    }

    // Check if submission already exists
    let submission
    const { data: existing } = await supabase
      .from('submissions')
      .select('*')
      .eq('url', url)
      .single()

    if (existing) {
      submission = existing
    } else {
      // Fetch preview and create new submission
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

      const { data: newSubmission, error: submitError } = await supabase
        .from('submissions')
        .insert({
          url,
          title,
          thumbnail_url: thumbnailUrl,
          dominant_color: dominantColor,
          submitted_by: 'shared_board',
        })
        .select()
        .single()

      if (submitError) {
        throw submitError
      }
      submission = newSubmission
    }

    // Check if already saved to this board
    const { data: existingSaved } = await supabase
      .from('saved_items')
      .select('id')
      .eq('user_id', board.user_id)
      .eq('submission_id', submission.id)
      .eq('board_id', board.id)
      .single()

    if (existingSaved) {
      return NextResponse.json({
        success: true,
        submission,
        message: 'Already in this board'
      })
    }

    // Add to board owner's saved_items
    const { error: saveError } = await supabase
      .from('saved_items')
      .insert({
        user_id: board.user_id,
        submission_id: submission.id,
        board_id: board.id,
      })

    if (saveError) {
      throw saveError
    }

    return NextResponse.json({
      success: true,
      submission
    })
  } catch (error) {
    console.error('Error submitting to board:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit' },
      { status: 500 }
    )
  }
}
