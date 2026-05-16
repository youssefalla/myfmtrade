import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Service role client to bypass RLS for webhook inserts
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.CheckoutSession
    const { trader_id, master_id } = session.metadata ?? {}
    if (!trader_id || !master_id) return NextResponse.json({ ok: true })

    // Create subscription record
    await supabaseAdmin.from('subscriptions').upsert({
      trader_id,
      master_id,
      stripe_session_id: session.id,
      status: 'active',
    }, { onConflict: 'trader_id,master_id' })

    // Create follow record
    await supabaseAdmin.from('follows').upsert({
      trader_id,
      master_id,
    }, { onConflict: 'trader_id,master_id' })
  }

  return NextResponse.json({ ok: true })
}
