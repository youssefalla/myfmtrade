import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { pairs, timeframes, style, entry_rules, risk_management } = await req.json()

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const prompt = `You are a professional quantitative trading analyst. Based on this trading strategy, simulate a realistic 1-month backtest (30 trading days) as if you ran it on real market conditions.

Strategy Details:
- Trading Pairs: ${pairs?.join(', ') || 'Not specified'}
- Timeframes: ${timeframes?.join(', ') || 'Not specified'}
- Style: ${style || 'Not specified'}
- Entry Rules: ${entry_rules || 'Not specified'}
- Risk Management: ${risk_management || 'Not specified'}

Simulate realistic day-by-day equity changes starting from 10000. Include realistic drawdowns, winning streaks, and losing streaks based on the strategy quality and risk management. Be honest — a weak strategy should show losses or high drawdown.

Respond ONLY with a valid JSON object in this exact format:
{
  "equity": [<exactly 30 numbers, day-by-day equity starting from first day after 10000 base>],
  "trades": <total trades in month, integer>,
  "win_rate": <win rate 0-100, one decimal>,
  "profit_factor": <e.g. 1.45, two decimals>,
  "max_drawdown": <max drawdown percent e.g. 8.5, one decimal>,
  "net_pnl": <net profit/loss percent e.g. 12.3 or -4.2, one decimal>,
  "summary": "<2 sentences: what the backtest reveals about this strategy's real-world performance>"
}`

    const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MOONSHOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      }),
    })

    const aiData = await res.json()
    const content = aiData.choices?.[0]?.message?.content ?? '{}'
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const result = JSON.parse(jsonMatch?.[0] ?? '{}')

    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
