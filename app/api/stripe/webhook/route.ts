import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getServiceClient } from '@/lib/supabase'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const clerkId = session.metadata?.clerk_id
        const plan = session.metadata?.plan as 'solo' | 'studio'
        const subscriptionId = session.subscription as string

        if (clerkId && plan) {
          await supabase
            .from('users')
            .update({
              plan,
              stripe_subscription_id: subscriptionId,
            })
            .eq('clerk_id', clerkId)

          console.log(`Updated user ${clerkId} to ${plan} plan`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Get user by customer ID
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (user && subscription.status === 'active') {
          // Determine plan from price
          const priceId = subscription.items.data[0]?.price.id
          let plan: 'solo' | 'studio' | 'free' = 'free'

          if (priceId === process.env.STRIPE_SOLO_PRICE_ID) {
            plan = 'solo'
          } else if (priceId === process.env.STRIPE_STUDIO_PRICE_ID) {
            plan = 'studio'
          }

          await supabase
            .from('users')
            .update({ plan })
            .eq('stripe_customer_id', customerId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Downgrade to free
        await supabase
          .from('users')
          .update({
            plan: 'free',
            stripe_subscription_id: null,
          })
          .eq('stripe_customer_id', customerId)

        console.log(`Downgraded customer ${customerId} to free plan`)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
