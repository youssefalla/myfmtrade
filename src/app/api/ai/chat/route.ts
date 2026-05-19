import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { messages, strategy } = await req.json()

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const strategyCtx = strategy?.entry_rules
      ? `\n\nTrader's current strategy:\n- Pairs: ${strategy.pairs?.join(', ') || 'not set'}\n- Timeframes: ${strategy.timeframes?.join(', ') || 'not set'}\n- Style: ${strategy.style || 'not set'}\n- Entry Rules: ${strategy.entry_rules}\n- Risk Management: ${strategy.risk_management || 'not set'}`
      : ''

    const system = `You are an elite trading coach and quantitative analyst on the TradeFlow platform. You help master traders with:
- Chart pattern analysis and technical setups
- Strategy backtesting (simulate results based on rules)
- Risk/reward optimization
- Entry and exit timing
- Performance improvement feedback
${strategyCtx}

Be concise, specific, and actionable. For backtests, provide realistic estimated win rates, drawdowns, and RR based on the strategy rules. Never fabricate data — always caveat simulations clearly.`

    const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MOONSHOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [{ role: 'system', content: system }, ...messages],
        temperature: 0.4,
        max_tokens: 800,
      }),
    })

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content ?? 'Sorry, I could not generate a response.'
    return NextResponse.json({ content })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
