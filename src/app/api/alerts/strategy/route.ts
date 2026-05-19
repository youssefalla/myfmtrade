import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { masterName, score, confirmation, explanation, userId } = await req.json()

    // Get master's email via service role
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    const email = user?.email
    if (!email) return NextResponse.json({ error: 'No email found for user' }, { status: 400 })

    const confirmationColor: Record<string, string> = {
      'STRONG BUY': '#4ADE80',
      'BUY': '#86EFAC',
      'NEUTRAL': '#C9A84C',
      'SELL': '#FCA5A5',
      'STRONG SELL': '#F87171',
    }
    const color = confirmationColor[confirmation] ?? '#C9A84C'
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `TradeFlow <${fromEmail}>`,
        to: email,
        subject: `🎯 Your strategy scored ${score}/10 — ${confirmation}`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; background: #0A0C0F; color: #F0EDE8; padding: 40px; border-radius: 16px;">
            <div style="margin-bottom: 32px;">
              <span style="font-size: 24px; font-weight: 700;">Trade<span style="color: #C9A84C;">Flow</span></span>
            </div>
            <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">Strategy Analysis Complete</h1>
            <p style="color: rgba(240,237,232,.6); margin-bottom: 32px;">Hi ${masterName}, your trading strategy has been analyzed by our AI.</p>

            <div style="background: rgba(201,168,76,.1); border: 1px solid rgba(201,168,76,.3); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
              <div style="font-size: 48px; font-weight: 700; color: #C9A84C;">${score}<span style="font-size: 24px;">/10</span></div>
              <div style="margin-top: 8px; font-size: 14px; font-weight: 600; color: ${color}; background: ${color}18; padding: 4px 16px; border-radius: 999px; display: inline-block;">${confirmation}</div>
            </div>

            <div style="background: rgba(255,255,255,.05); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <p style="font-size: 14px; color: rgba(240,237,232,.7); line-height: 1.6; margin: 0;">${explanation}</p>
            </div>

            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/master/history"
              style="display: block; background: linear-gradient(135deg,#E0C26A,#C9A84C); color: #1F2329; text-align: center; padding: 14px; border-radius: 999px; font-weight: 700; text-decoration: none; font-size: 14px;">
              View Full Strategy History →
            </a>

            <p style="margin-top: 24px; font-size: 12px; color: rgba(240,237,232,.3); text-align: center;">TradeFlow · Strategy Intelligence</p>
          </div>
        `,
      }),
    })

    if (!resendRes.ok) {
      const errBody = await resendRes.json().catch(() => ({}))
      console.error('Resend error:', resendRes.status, errBody)
      return NextResponse.json({ error: `Resend error ${resendRes.status}: ${JSON.stringify(errBody)}` }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('Email alert error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
