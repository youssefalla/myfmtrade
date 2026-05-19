'use client'

import { useEffect, useState } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import type { Profile } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

const PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'US30', 'NAS100', 'USOIL', 'XAGUSD']
const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1']

interface AIResult {
  score: number
  confirmation: string
  explanation: string
  strengths: string[]
  risks: string[]
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="text-center mb-4">
      <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--tf-text)' }}>{title}</h2>
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 10px rgba(201,168,76,.4)' }} />
    </div>
  )
}

function ScoreChart({ score, color }: { score: number; color: string }) {
  const W = 280, H = 130, PAD = 18
  const rel = [0.50, 0.42, 0.60, 0.53, 0.70, 0.82, 1.0]
  const s = score / 10
  const pts = rel.map((r, i) => ({
    x: PAD + (i / (rel.length - 1)) * (W - PAD * 2),
    y: H - PAD - r * s * (H - PAD * 1.5),
  }))
  let line = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i]
    const cx = (a.x + b.x) / 2
    line += ` C ${cx} ${a.y} ${cx} ${b.y} ${b.x} ${b.y}`
  }
  const fill = line + ` L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`
  const uid = `sg${score}`
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${uid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((pt, i) => (
        <g key={i}>
          <line x1={pt.x} y1={pt.y} x2={pt.x} y2={H - 4} stroke={color} strokeWidth="0.6" strokeOpacity="0.25" strokeDasharray="2 3" />
          <circle cx={pt.x} cy={pt.y} r="3.2" fill={color} stroke="#0c1829" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  )
}

const confirmationColor: Record<string, string> = {
  'STRONG BUY': '#4ADE80',
  'BUY': '#86EFAC',
  'NEUTRAL': '#C9A84C',
  'SELL': '#FCA5A5',
  'STRONG SELL': '#F87171',
}

export default function StrategyPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [scoring, setScoring] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    pairs: [] as string[],
    timeframes: [] as string[],
    style: '',
    entry_rules: '',
    risk_management: '',
  })

  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [aiError, setAiError] = useState('')
  const [chartPair, setChartPair] = useState('XAUUSD')

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const [pRes, sRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('strategies').select('*').eq('master_id', user.id).single(),
      ])

      setProfile(pRes.data)

      if (sRes.data) {
        setForm({
          pairs: sRes.data.pairs ?? [],
          timeframes: sRes.data.timeframes ?? [],
          style: sRes.data.style ?? '',
          entry_rules: sRes.data.entry_rules ?? '',
          risk_management: sRes.data.risk_management ?? '',
        })
        if (sRes.data.ai_score) {
          setAiResult({
            score: sRes.data.ai_score,
            confirmation: sRes.data.ai_confirmation ?? 'NEUTRAL',
            explanation: sRes.data.ai_explanation ?? '',
            strengths: [],
            risks: [],
          })
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  async function scoreStrategy() {
    if (!form.entry_rules) { setAiError('Please fill in your entry rules first.'); return }
    setScoring(true); setAiError(''); setSaved(false)
    try {
      const res = await fetch('/api/ai/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAiResult(data)
      setSaved(true)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setScoring(false)
    }
  }

  function togglePair(p: string) {
    setForm(f => ({ ...f, pairs: f.pairs.includes(p) ? f.pairs.filter(x => x !== p) : [...f.pairs, p] }))
  }
  function toggleTF(t: string) {
    setForm(f => ({ ...f, timeframes: f.timeframes.includes(t) ? f.timeframes.filter(x => x !== t) : [...f.timeframes, t] }))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center tf-page"><div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div></div>

  const scoreColor = aiResult ? (aiResult.score >= 8 ? '#4ADE80' : aiResult.score >= 6 ? '#C9A84C' : '#F87171') : '#C9A84C'

  return (
    <div className="h-screen flex overflow-hidden tf-page" style={{ fontFamily: SYS }}>
      <MasterSidebar profile={profile} onAvatarChange={url => setProfile(p => p ? { ...p, avatar_url: url } : p)} />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <div className="text-center tf-fade-in" style={{ animationDelay: '0s' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }}>Strategy Intelligence</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--tf-subtle)' }}>Build your strategy, get AI scoring, and receive email alerts.</p>
            <div className="mt-3" style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 12px rgba(201,168,76,.45)' }} />
          </div>

          {/* ROW 1 — Chart (left 2/3) + AI Score (right 1/3) */}
          <div className="grid grid-cols-3 gap-4 tf-fade-in" style={{ animationDelay: '0.1s' }}>

            {/* Single chart — spans 2 cols */}
            <div className="rounded-2xl overflow-hidden tf-card-bg col-span-2" style={{ boxShadow: 'inset 0 1px 80px rgba(201,168,76,.05), 0 0 0 1px rgba(201,168,76,.12)' }}>
              <div className="px-4 pt-4 pb-0">
                <div className="text-center mb-2">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>Live Chart</h2>
                    <select value={chartPair} onChange={e => setChartPair(e.target.value)}
                      className="text-xs font-mono rounded-lg px-2 py-1 outline-none"
                      style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)', color: 'var(--tf-muted)' }}>
                      {PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 10px rgba(201,168,76,.4)' }} />
                </div>
              </div>
              <iframe key={chartPair}
                src={`https://s.tradingview.com/widgetembed/?frameElementId=tv1&symbol=${chartPair}&interval=H1&theme=dark&style=1&locale=en&hide_top_toolbar=false&hide_legend=false&save_image=false&calendar=false`}
                style={{ width: '100%', height: 480, border: 'none' }}
                allowTransparency allowFullScreen />
            </div>

            {/* AI Score */}
            <div className="col-span-1">
              {aiResult ? (
                <div className="rounded-2xl p-5 h-full flex flex-col"
                  style={{
                    background: 'linear-gradient(160deg, #E0C26A 0%, #C9A84C 45%, #B8943E 100%)',
                    border: '1px solid rgba(255,255,255,.18)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25)',
                  }}>

                  {/* Header */}
                  <div className="text-center mb-3">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-sm font-bold" style={{ color: '#1a1200' }}>AI Analysis</span>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(0,0,0,.18)', color: '#fff' }}>
                        {aiResult.confirmation}
                      </span>
                    </div>
                    <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,0,0,.2) 50%, transparent)' }} />
                  </div>

                  {/* Score chart */}
                  <div className="relative rounded-xl overflow-hidden mb-3" style={{ background: 'rgba(0,0,0,.22)' }}>
                    <ScoreChart score={aiResult.score} color="#fff" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span style={{ fontSize: '2.6rem', fontWeight: 800, color: '#fff', lineHeight: 1, textShadow: '0 2px 12px rgba(0,0,0,.3)' }}>{aiResult.score * 10}%</span>
                      <span className="text-[10px] mt-1 font-mono" style={{ color: 'rgba(255,255,255,.6)' }}>Strategy Score</span>
                    </div>
                  </div>

                  {/* Explanation */}
                  <p className="text-xs leading-relaxed mb-3 text-center" style={{ color: 'rgba(0,0,0,.65)' }}>{aiResult.explanation}</p>

                  {/* Strengths */}
                  {aiResult.strengths?.length > 0 && (
                    <div className="rounded-xl p-3 mb-2" style={{ background: 'rgba(0,0,0,.15)', border: '1px solid rgba(255,255,255,.15)' }}>
                      <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: '#1a1200' }}>Strengths</div>
                      {aiResult.strengths.slice(0, 2).map((s, i) => (
                        <div key={i} className="text-[11px] mb-1 flex gap-1.5" style={{ color: '#fff' }}>
                          <span style={{ color: '#4ADE80' }}>✓</span>{s}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Risks */}
                  {aiResult.risks?.length > 0 && (
                    <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,.15)', border: '1px solid rgba(255,255,255,.15)' }}>
                      <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: '#1a1200' }}>Risks</div>
                      {aiResult.risks.slice(0, 2).map((r, i) => (
                        <div key={i} className="text-[11px] mb-1 flex gap-1.5" style={{ color: '#fff' }}>
                          <span style={{ color: '#FECACA' }}>⚠</span>{r}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center"
                  style={{
                    background: 'linear-gradient(135deg, #E0C26A 0%, #C9A84C 40%, #B8943E 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25)',
                    border: '1px solid rgba(255,255,255,.15)',
                  }}>
                  <div className="text-3xl mb-3">🤖</div>
                  <p className="text-sm font-bold mb-2" style={{ color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,.3)' }}>No AI score yet</p>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,.75)' }}>Fill in your strategy and click "Score My Strategy" to get your AI analysis.</p>
                </div>
              )}
            </div>
          </div>

          {/* ROW 2 — Trading Pairs + Trading Style */}
          <div className="grid grid-cols-2 gap-4 tf-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="rounded-2xl p-5 tf-card-bg" style={{ boxShadow: 'inset 0 1px 80px rgba(201,168,76,.05), 0 0 0 1px rgba(201,168,76,.12)' }}>
              <SectionHeading title="Trading Pairs" />
              <div className="flex flex-wrap gap-2">
                {PAIRS.map(p => (
                  <button key={p} onClick={() => togglePair(p)}
                    className="rounded-full px-3 py-1.5 text-xs font-mono transition-all"
                    style={{ border: form.pairs.includes(p) ? '1px solid #C9A84C' : '1px solid var(--tf-border)', background: form.pairs.includes(p) ? 'rgba(201,168,76,.15)' : 'transparent', color: form.pairs.includes(p) ? '#C9A84C' : 'var(--tf-muted)' }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-5 tf-card-bg" style={{ boxShadow: 'inset 0 1px 80px rgba(201,168,76,.05), 0 0 0 1px rgba(201,168,76,.12)' }}>
              <SectionHeading title="Trading Style" />
              <div className="grid grid-cols-3 gap-2">
                {['Scalping', 'Day Trading', 'Swing', 'SMC', 'Price Action', 'ICT'].map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, style: s }))}
                    className="rounded-xl py-2.5 text-xs font-medium transition-all"
                    style={{ border: form.style === s ? '1px solid #C9A84C' : '1px solid var(--tf-border)', background: form.style === s ? 'rgba(201,168,76,.1)' : 'transparent', color: form.style === s ? '#C9A84C' : 'var(--tf-muted)' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 3 — Timeframes */}
          <div className="rounded-2xl p-5 tf-card-bg tf-fade-in" style={{ boxShadow: 'inset 0 1px 80px rgba(201,168,76,.05), 0 0 0 1px rgba(201,168,76,.12)', animationDelay: '0.3s' }}>
            <SectionHeading title="Timeframes" />
            <div className="flex flex-wrap gap-2">
              {TIMEFRAMES.map(t => (
                <button key={t} onClick={() => toggleTF(t)}
                  className="rounded-full px-4 py-1.5 text-xs font-mono transition-all"
                  style={{ border: form.timeframes.includes(t) ? '1px solid #C9A84C' : '1px solid var(--tf-border)', background: form.timeframes.includes(t) ? 'rgba(201,168,76,.15)' : 'transparent', color: form.timeframes.includes(t) ? '#C9A84C' : 'var(--tf-muted)' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* ROW 4 — Entry Rules + Risk Management */}
          <div className="grid grid-cols-2 gap-4 tf-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="rounded-2xl p-5 tf-card-bg" style={{ boxShadow: 'inset 0 1px 80px rgba(201,168,76,.05), 0 0 0 1px rgba(201,168,76,.12)' }}>
              <SectionHeading title="Entry Rules" />
              <p className="text-xs mb-3 text-center" style={{ color: 'var(--tf-subtle)' }}>Describe your setup: structure, confluence, triggers…</p>
              <textarea value={form.entry_rules}
                onChange={e => setForm(f => ({ ...f, entry_rules: e.target.value }))}
                rows={5} placeholder="e.g. I wait for a market structure break on H4, then look for a BOS on H1 with a 50% FVG entry on M15..."
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none tf-input" />
            </div>

            <div className="rounded-2xl p-5 tf-card-bg" style={{ boxShadow: 'inset 0 1px 80px rgba(201,168,76,.05), 0 0 0 1px rgba(201,168,76,.12)' }}>
              <SectionHeading title="Risk Management" />
              <p className="text-xs mb-3 text-center" style={{ color: 'var(--tf-subtle)' }}>Define your risk rules and position sizing…</p>
              <textarea value={form.risk_management}
                onChange={e => setForm(f => ({ ...f, risk_management: e.target.value }))}
                rows={5} placeholder="e.g. Max 1% risk per trade, 1:3 RR minimum, stop loss always behind structure, max 2 trades per day..."
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none tf-input" />
            </div>
          </div>

          {/* ROW 5 — Button */}
          {aiError && <p className="text-xs font-mono text-center" style={{ color: '#F87171' }}>{aiError}</p>}
          {saved && <p className="text-xs font-mono text-center" style={{ color: '#4ADE80' }}>✓ Strategy saved. Email sent if score ≥ 7.</p>}

          <button onClick={scoreStrategy} disabled={scoring}
            className="btn-gold rounded-xl py-4 text-sm font-semibold w-full tf-fade-in" style={{ animationDelay: '0.5s' }}>
            {scoring ? 'AI is analyzing your strategy…' : '🤖 Score My Strategy with AI'}
          </button>

        </div>
      </main>
    </div>
  )
}
