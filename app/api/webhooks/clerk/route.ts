import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function POST(req: Request) {
  // Get the webhook secret from environment
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Verify the webhook
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getServiceClient()

  // Handle the event
  switch (evt.type) {
    case 'user.created':
    case 'user.updated': {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data
      const email = email_addresses?.[0]?.email_address || ''
      const name = [first_name, last_name].filter(Boolean).join(' ') || null

      // Upsert user
      const { error } = await supabase
        .from('users')
        .upsert({
          clerk_id: id,
          email,
          name,
          avatar_url: image_url || null,
        }, {
          onConflict: 'clerk_id',
        })

      if (error) {
        console.error('Error upserting user:', error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      // If new user, create their default workspace
      if (evt.type === 'user.created') {
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_id', id)
          .single()

        if (user) {
          await supabase.from('workspaces').insert({
            owner_id: user.id,
            name: 'My Workspace',
            slug: `workspace-${user.id.slice(0, 8)}`,
          })
        }
      }

      break
    }

    case 'user.deleted': {
      const { id } = evt.data

      // User deletion cascades to workspaces, boards, etc.
      await supabase
        .from('users')
        .delete()
        .eq('clerk_id', id)

      break
    }
  }

  return NextResponse.json({ received: true })
}
