import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Map our timeframe labels to Twelve Data intervals
const TF_MAP: Record<string, string> = {
  M1: '1min', M5: '5min', M15: '15min', M30: '30min',
  H1: '1h', H4: '4h', D1: '1day', W1: '1week',
}

// Map our pair labels to Twelve Data symbols
const SYMBOL_MAP: Record<string, string> = {
  XAUUSD: 'XAU/USD', EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD',
  USDJPY: 'USD/JPY', BTCUSD: 'BTC/USD', ETHUSD: 'ETH/USD',
  US30: 'DJI', NAS100: 'NDX', USOIL: 'WTI/USD', XAGUSD: 'XAG/USD',
}

async function getCandles(pair: string, timeframe: string): Promise<string> {
  const symbol = SYMBOL_MAP[pair] ?? pair
  const interval = TF_MAP[timeframe] ?? '15min'
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=10&apikey=${process.env.TWELVE_DATA_API_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.status === 'error' || !data.values) return `No data: ${data.message ?? 'unknown'}`
  return data.values.slice(0, 5).map((c: Record<string, string>) =>
    `${c.datetime} O:${c.open} H:${c.high} L:${c.low} C:${c.close}`
  ).join('\n')
}

async function checkSignal(strategy: {
  pairs: string[], timeframes: string[], style: string,
  entry_rules: string, risk_management: string
}, pair: string, timeframe: string): Promise<boolean> {
  const candles = await getCandles(pair, timeframe)

  const prompt = `You are a trading signal detector. Analyze the current market data and determine if the master trader's strategy conditions are currently met.

Strategy:
- Pairs: ${strategy.pairs?.join(', ')}
- Timeframes: ${strategy.timeframes?.join(', ')}
- Style: ${strategy.style}
- Entry Rules: ${strategy.entry_rules}
- Risk Management: ${strategy.risk_management}

Current market data for ${pair} ${timeframe} (most recent candles, newest first):
${candles}

Question: Based on the entry rules above, is there a valid trade setup RIGHT NOW on ${pair} ${timeframe}?

Reply with ONLY: YES or NO`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 10,
    messages: [{ role: 'user', content: prompt }],
  })
  const answer = response.content[0].type === 'text' ? response.content[0].text.trim().toUpperCase() : 'NO'
  return answer.startsWith('YES')
}

async function sendMarketAlert(
  email: string, masterName: string,
  pair: string, timeframe: string, style: string
) {
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `TradeFlow <${fromEmail}>`,
      to: email,
      subject: `📈 ${pair} — ${style} setup detected on ${timeframe}`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;background:#0A0C0F;color:#F0EDE8;padding:40px;border-radius:16px;">
          <div style="margin-bottom:24px;">
            <span style="font-size:22px;font-weight:700;">Trade<span style="color:#C9A84C;">Flow</span></span>
          </div>
          <h1 style="font-size:20px;font-weight:700;margin-bottom:8px;">🎯 Market Signal Detected</h1>
          <p style="color:rgba(240,237,232,.6);margin-bottom:28px;">Hi ${masterName}, your strategy conditions are met right now.</p>

          <div style="background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);border-radius:12px;padding:24px;margin-bottom:24px;">
            <div style="font-size:28px;font-weight:800;color:#C9A84C;">${pair}</div>
            <div style="margin-top:6px;font-size:14px;color:rgba(240,237,232,.7);">${timeframe} · ${style}</div>
            <div style="margin-top:12px;font-size:13px;color:rgba(240,237,232,.5);">Your entry rules match current market conditions</div>
          </div>

          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/master/strategy"
            style="display:block;background:linear-gradient(135deg,#E0C26A,#C9A84C);color:#1F2329;text-align:center;padding:14px;border-radius:999px;font-weight:700;text-decoration:none;font-size:14px;">
            Open Strategy Dashboard →
          </a>

          <p style="margin-top:24px;font-size:11px;color:rgba(240,237,232,.3);text-align:center;">TradeFlow · Market Alerts · You receive this because you have an active strategy</p>
        </div>
      `,
    }),
  })
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Load all strategies that have entry rules
  const { data: strategies, error } = await supabase
    .from('strategies')
    .select('master_id, pairs, timeframes, style, entry_rules, risk_management')
    .not('entry_rules', 'is', null)

  if (error || !strategies?.length) {
    return NextResponse.json({ ok: true, checked: 0 })
  }

  let alertsSent = 0

  for (const strategy of strategies) {
    const pairs: string[] = strategy.pairs ?? []
    const timeframes: string[] = strategy.timeframes ?? []
    if (!pairs.length || !timeframes.length || !strategy.entry_rules) continue

    // Use the first (primary) timeframe
    const primaryTF = timeframes[0]

    for (const pair of pairs) {
      // Check cooldown — skip if alerted in last 4 hours
      const cooldownFrom = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      const { data: recent } = await supabase
        .from('market_alerts')
        .select('id')
        .eq('master_id', strategy.master_id)
        .eq('pair', pair)
        .gte('created_at', cooldownFrom)
        .limit(1)

      if (recent?.length) continue // already alerted recently

      // Check signal via AI
      let signalFound = false
      try {
        signalFound = await checkSignal(strategy, pair, primaryTF)
      } catch (e) {
        console.error(`Signal check failed for ${pair}:`, e)
        continue
      }

      if (!signalFound) continue

      // Get master's email
      const { data: { user } } = await supabase.auth.admin.getUserById(strategy.master_id)
      if (!user?.email) continue

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', strategy.master_id)
        .single()

      const masterName = profile?.full_name ?? 'Master Trader'

      // Send email
      try {
        await sendMarketAlert(user.email, masterName, pair, primaryTF, strategy.style ?? 'Strategy')
        alertsSent++
      } catch (e) {
        console.error(`Email failed for ${user.email}:`, e)
        continue
      }

      // Log the alert to prevent duplicates
      await supabase.from('market_alerts').insert({
        master_id: strategy.master_id,
        pair,
        timeframe: primaryTF,
      })
    }
  }

  return NextResponse.json({ ok: true, checked: strategies.length, alertsSent })
}
