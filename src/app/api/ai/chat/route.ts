import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYMBOL_MAP: Record<string, string> = {
  XAUUSD: 'XAU/USD', EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD',
  USDJPY: 'USD/JPY', BTCUSD: 'BTC/USD', ETHUSD: 'ETH/USD',
  US30: 'DJI', NAS100: 'NDX', USOIL: 'WTI/USD', XAGUSD: 'XAG/USD',
}

const TF_MAP: Record<string, string> = {
  M1: '1min', M5: '5min', M15: '15min', M30: '30min',
  H1: '1h', H4: '4h', D1: '1day', W1: '1week',
}

async function fetchLiveData(pairs: string[], timeframe = 'M15'): Promise<string> {
  const interval = TF_MAP[timeframe] ?? '15min'
  const lines: string[] = []

  for (const pair of pairs.slice(0, 4)) {
    const symbol = SYMBOL_MAP[pair] ?? pair
    try {
      const res = await fetch(
        `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=6&apikey=${process.env.TWELVE_DATA_API_KEY}`
      )
      const data = await res.json()
      if (data.status === 'error' || !data.values?.length) continue

      const [c0, c1, c2] = data.values
      lines.push(
        `${pair} (${timeframe}) — Live price: ${c0.close}` +
        `\n  Latest candle  O:${c0.open} H:${c0.high} L:${c0.low} C:${c0.close} @ ${c0.datetime}` +
        `\n  Prev candle    O:${c1.open} H:${c1.high} L:${c1.low} C:${c1.close}` +
        (c2 ? `\n  2 candles ago  O:${c2.open} H:${c2.high} L:${c2.low} C:${c2.close}` : '')
      )
    } catch { /* skip pair on error */ }
  }

  return lines.length
    ? `\n\n📊 LIVE MARKET DATA (Twelve Data — real-time):\n${lines.join('\n\n')}`
    : ''
}

const SYSTEM_BUILDER = `You are an AI trading strategy coach on TradeFlow. Your job is to guide this master trader through building their complete strategy in exactly 5 steps. Be conversational, warm, and professional. Do one step at a time — never skip ahead.

You also have access to LIVE market data injected into this conversation. Use it naturally when relevant — e.g. reference the current price, recent candle patterns, or market structure when helping the trader define their strategy.

STEP 1 — TRADING PAIRS
Ask which markets they trade. Suggest: XAUUSD (Gold), EURUSD, GBPUSD, BTCUSD, NAS100, US30, USOIL. They can pick multiple. Just list options as short bullet points.

STEP 2 — TIMEFRAMES
Based on their pairs, suggest the most relevant timeframes. Recommend a top-down analysis approach (e.g. H4 for bias, M15 for entry). Multiple allowed.

STEP 3 — TRADING STYLE
Ask their trading style. Options: Scalping, Day Trading, Swing, Price Action, SMC, ICT. Explain each in one word (e.g. "Scalping — fast M1-M5 entries").

STEP 4 — ENTRY RULES
Ask what they look for in a setup. Then BUILD a complete, specific entry ruleset FOR them (do 90% of the work). Include: market structure, confirmation signals, entry trigger, timeframe alignment. Reference the LIVE market data to show a real example if relevant. End with "Does this match your approach or would you like to adjust anything?"

STEP 5 — RISK MANAGEMENT
PROPOSE a complete, specific risk framework for them (90% done). Include: % risk per trade, stop loss placement, TP targets/RR ratio, max daily loss, max trades per day. Tailor it to their style. End with "Does this work for you or shall we adjust?"

Rules:
- One step at a time. Move to next step only after user confirms or answers.
- Keep responses short with bullet points. Max 6 bullets per message.
- Each message must end with one clear question.
- Be encouraging. When user confirms something, celebrate briefly before moving on.
- When you have live data, use it naturally (e.g. "XAUUSD is currently at 2,890 — here's what I see...")

When ALL 5 steps are confirmed and the user has given final approval on steps 4 and 5, output this EXACTLY at the very end of your final message (no text after it):
<STRATEGY_DATA>
{"pairs":["XAUUSD"],"timeframes":["M5","M15"],"style":"Scalping","entry_rules":"Full detailed entry rules text here...","risk_management":"Full detailed risk management text here..."}
</STRATEGY_DATA>`

const SYSTEM_CHAT = `You are an elite trading coach and quantitative analyst on the TradeFlow platform. You have access to LIVE market data injected into this conversation — use it to give specific, real-time analysis. Help master traders with chart pattern analysis, strategy backtesting, risk/reward optimization, entry/exit timing, and performance improvement. Be concise, specific, and actionable. Reference actual current prices when available. For backtests, provide realistic estimated win rates, drawdowns, and RR. Never fabricate data.`

export async function POST(req: NextRequest) {
  try {
    const { messages, strategy, mode, chartPair, pairs } = await req.json()

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Determine which pairs to fetch live data for
    const pairsToFetch: string[] = []
    if (chartPair) pairsToFetch.push(chartPair)
    if (pairs?.length) pairs.forEach((p: string) => { if (!pairsToFetch.includes(p)) pairsToFetch.push(p) })
    if (strategy?.pairs?.length) strategy.pairs.forEach((p: string) => { if (!pairsToFetch.includes(p)) pairsToFetch.push(p) })

    // Primary timeframe for live data
    const primaryTF = strategy?.timeframes?.[0] ?? pairs?.[0] ? 'M15' : 'M15'

    // Fetch live market data
    const liveData = pairsToFetch.length ? await fetchLiveData(pairsToFetch, primaryTF) : ''

    let system = mode === 'builder' ? SYSTEM_BUILDER : SYSTEM_CHAT

    // Inject live data into system prompt
    if (liveData) system += liveData

    // Add strategy context for free-chat mode
    if (mode !== 'builder' && strategy?.entry_rules) {
      system += `\n\nTrader's strategy:\n- Pairs: ${strategy.pairs?.join(', ') || 'not set'}\n- Timeframes: ${strategy.timeframes?.join(', ') || 'not set'}\n- Style: ${strategy.style || 'not set'}\n- Entry Rules: ${strategy.entry_rules}\n- Risk Management: ${strategy.risk_management || 'not set'}`
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system,
      messages: messages
        .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
        .map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ content })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
