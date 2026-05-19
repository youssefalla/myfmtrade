import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

    const prompt = `You are a professional trading coach and strategy analyst. Analyze this master trader's strategy in full detail.

Strategy Details:
- Trading Pairs: ${pairs?.join(', ') || 'Not specified'}
- Timeframes: ${timeframes?.join(', ') || 'Not specified'}
- Style: ${style || 'Not specified'}
- Entry Rules: ${entry_rules || 'Not specified'}
- Risk Management: ${risk_management || 'Not specified'}

Give a thorough analysis including ALL mistakes, weaknesses, and areas for improvement — even minor ones. Be honest and specific.

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "score": <number from 1 to 10>,
  "confirmation": "<one of: STRONG BUY, BUY, NEUTRAL, SELL, STRONG SELL>",
  "explanation": "<3-4 sentences: overall assessment, what works, what doesn't, key areas to improve>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "risks": ["<specific mistake or risk 1>", "<specific mistake or risk 2>", "<specific mistake or risk 3>", "<specific mistake or risk 4>"]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const result = JSON.parse(jsonMatch?.[0] ?? '{}')

    // Update strategies table with score
    await supabase.from('strategies').upsert({
      master_id: user.id,
      pairs, timeframes, style, entry_rules, risk_management,
      ai_score: result.score,
      ai_explanation: result.explanation,
      ai_confirmation: result.confirmation,
      last_scored_at: new Date().toISOString(),
    }, { onConflict: 'master_id' })

    // Save to strategy history
    await supabase.from('strategy_history').insert({
      master_id: user.id,
      pairs, timeframes, style, entry_rules, risk_management,
      ai_score: result.score,
      ai_confirmation: result.confirmation,
      ai_explanation: result.explanation,
      ai_strengths: result.strengths ?? [],
      ai_risks: result.risks ?? [],
    })

    // Send email alert
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/alerts/strategy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        masterName: profile?.full_name ?? 'Master Trader',
        score: result.score,
        confirmation: result.confirmation,
        explanation: result.explanation,
        userId: user.id,
      }),
    })

    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
