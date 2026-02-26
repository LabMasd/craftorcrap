import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { CATEGORIES } from '@/types'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const { submission_id, category } = await request.json()

    if (!submission_id || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getServiceClient()

    // Check if submission exists and has no category
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('id, category')
      .eq('id', submission_id)
      .single()

    if (fetchError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Only allow setting category if it's currently null
    if (submission.category) {
      return NextResponse.json(
        { error: 'Category already set' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Update the category
    const { error: updateError } = await supabase
      .from('submissions')
      .update({ category })
      .eq('id', submission_id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true, category }, { headers: corsHeaders })
  } catch (error) {
    console.error('Category update error:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500, headers: corsHeaders }
    )
  }
}
