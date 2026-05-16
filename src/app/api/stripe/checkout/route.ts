import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { masterId, masterName } = await req.json()

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('trader_id', user.id)
      .eq('master_id', masterId)
      .eq('status', 'active')
      .single()

    if (existing) return NextResponse.json({ error: 'Already subscribed' }, { status: 400 })

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Copy ${masterName} — TradeFlow`, description: 'Monthly copy trading subscription' },
          unit_amount: 3500, // $35.00
        },
        quantity: 1,
      }],
      metadata: { trader_id: user.id, master_id: masterId },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/copy?subscribed=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/marketplace`,
    })

    return NextResponse.json({ url: session.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
