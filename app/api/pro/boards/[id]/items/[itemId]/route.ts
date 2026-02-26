import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

// PATCH /api/pro/boards/[id]/items/[itemId] - Update an item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = await request.json()
    const allowedFields = ['title', 'description', 'position']
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowedFields.includes(key))
    )

    const supabase = getServiceClient()

    const { data: item, error } = await supabase
      .from('board_items')
      .update(filteredUpdates)
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      console.error('Error updating item:', error)
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error in PATCH /api/pro/boards/[id]/items/[itemId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/pro/boards/[id]/items/[itemId] - Delete an item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()

    const { error } = await supabase
      .from('board_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      console.error('Error deleting item:', error)
      return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/pro/boards/[id]/items/[itemId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
