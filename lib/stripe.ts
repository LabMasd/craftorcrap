import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

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
