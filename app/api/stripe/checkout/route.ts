import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { stripe, PLANS } from '@/lib/stripe'
import { getServiceClient } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    // Debug: check if Stripe key exists
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe key not configured' }, { status: 500 })
    }

    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan } = await request.json()

    if (!plan || !['solo', 'studio'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const clerkUser = await currentUser()
    const email = clerkUser?.emailAddresses[0]?.emailAddress

    // Get or create Stripe customer
    const supabase = getServiceClient()
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('clerk_id', userId)
      .single()

    let customerId = user?.stripe_customer_id

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: email || undefined,
        metadata: {
          clerk_id: userId,
        },
      })
      customerId = customer.id

      // Save customer ID to database
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('clerk_id', userId)
    }

    // Create checkout session
    const priceId = PLANS[plan as keyof typeof PLANS].priceId

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pro?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/go-pro?canceled=true`,
      metadata: {
        clerk_id: userId,
        plan,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create checkout session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
