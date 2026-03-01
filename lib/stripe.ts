import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  }
  return _stripe
}

// Legacy export for backwards compatibility
export const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : (null as unknown as Stripe)

export const PLANS = {
  solo: {
    priceId: process.env.STRIPE_SOLO_PRICE_ID!,
    name: 'Solo',
  },
  studio: {
    priceId: process.env.STRIPE_STUDIO_PRICE_ID!,
    name: 'Studio',
  },
}
