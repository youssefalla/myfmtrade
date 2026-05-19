'use client'

import { useEffect, useRef, useState } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import { Send } from 'lucide-react'
import type { Profile } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

const PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'US30', 'NAS100', 'USOIL', 'XAGUSD']
const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1']

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface HistoryEntry {
  id: string
  created_at: string
  ai_score: number
  ai_confirmation: string
  ai_explanation: string
  ai_strengths: string[]
  ai_risks: string[]
  style: string
  pairs: string[]
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="text-center mb-4">
      <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--tf-text)' }}>{title}</h2>
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 10px rgba(201,168,76,.4)' }} />
    </div>
  )
}

const SUGGESTIONS = [
  'Score and analyze my strategy',
  'Simulate a backtest for last month',
  'What are the biggest risks in my setup?',
  'How can I improve my entries?',
]

export default function StrategyPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    pairs: [] as string[],
    timeframes: [] as string[],
    style: '',
    entry_rules: '',
    risk_management: '',
  })

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const chatBottomRef = useRef<HTMLDivElement>(null)

  const [chartPair, setChartPair] = useState('XAUUSD')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const [pRes, sRes, hRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('strategies').select('*').eq('master_id', user.id).single(),
        supabase.from('strategy_history').select('*').eq('master_id', user.id).order('created_at', { ascending: false }).limit(20),
      ])

      setProfile(pRes.data)
      setHistory((hRes.data ?? []) as HistoryEntry[])

      if (sRes.data) {
        setForm({
          pairs: sRes.data.pairs ?? [],
          timeframes: sRes.data.timeframes ?? [],
          style: sRes.data.style ?? '',
          entry_rules: sRes.data.entry_rules ?? '',
          risk_management: sRes.data.risk_management ?? '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function sendChat(text?: string) {
    const content = (text ?? chatInput).trim()
    if (!content || chatLoading) return
    setChatInput('')
    setChatError('')
    const userMsg: ChatMessage = { role: 'user', content }
    const updated = [...chatMessages, userMsg]
    setChatMessages(updated)
    setChatLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated, strategy: form }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch (e) {
      setChatError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setChatLoading(false)
    }
  }

  async function saveStrategy() {
    if (!form.entry_rules) return
    setSaved(false)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('strategies').upsert({ master_id: user.id, ...form }, { onConflict: 'master_id' })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
  }

  function togglePair(p: string) {
    setForm(f => ({ ...f, pairs: f.pairs.includes(p) ? f.pairs.filter(x => x !== p) : [...f.pairs, p] }))
  }
  function toggleTF(t: string) {
    setForm(f => ({ ...f, timeframes: f.timeframes.includes(t) ? f.timeframes.filter(x => x !== t) : [...f.timeframes, t] }))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center tf-page"><div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div></div>

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

            {/* AI Chat */}
            <div className="col-span-1 rounded-2xl flex flex-col overflow-hidden tf-card-bg"
              style={{ boxShadow: 'inset 0 1px 80px rgba(201,168,76,.05), 0 0 0 1px rgba(201,168,76,.12)', height: '100%' }}>

              {/* Chat header */}
              <div className="px-4 pt-4 pb-3 shrink-0">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>AI Trading Assistant</span>
                  <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.2)', color: '#4ADE80' }}>
                    <span className="live-dot" />Kimi
                  </div>
                </div>
                <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 10px rgba(201,168,76,.4)' }} />
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 min-h-0">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 py-4">
                    <div className="text-2xl">🤖</div>
                    <p className="text-[11px] text-center leading-relaxed" style={{ color: 'var(--tf-subtle)' }}>
                      Ask me anything about your strategy, chart analysis, or backtest.
                    </p>
                    <div className="w-full space-y-1.5 mt-1">
                      {SUGGESTIONS.map(s => (
                        <button key={s} onClick={() => sendChat(s)}
                          className="w-full text-left rounded-xl px-3 py-2 text-[11px] transition-all hover:opacity-90"
                          style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.18)', color: 'var(--tf-muted)' }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[88%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed"
                        style={msg.role === 'user' ? {
                          background: 'rgba(201,168,76,.15)',
                          border: '1px solid rgba(201,168,76,.25)',
                          color: 'var(--tf-text)',
                          borderBottomRightRadius: 4,
                        } : {
                          background: 'var(--tf-card-inner)',
                          border: '1px solid var(--tf-border)',
                          color: 'var(--tf-muted)',
                          borderBottomLeftRadius: 4,
                          whiteSpace: 'pre-wrap',
                        }}>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-3 py-2 text-[11px]"
                      style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)', color: 'var(--tf-subtle)', borderBottomLeftRadius: 4 }}>
                      <span className="animate-pulse">Thinking…</span>
                    </div>
                  </div>
                )}
                {chatError && (
                  <p className="text-[10px] text-center font-mono" style={{ color: '#F87171' }}>{chatError}</p>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat input */}
              <div className="px-3 pb-3 pt-2 shrink-0" style={{ borderTop: '1px solid var(--tf-border)' }}>
                <div className="flex gap-2 items-center">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                    placeholder="Ask about chart, backtest…"
                    className="flex-1 rounded-xl px-3 py-2 text-[11px] outline-none tf-input"
                  />
                  <button onClick={() => sendChat()} disabled={!chatInput.trim() || chatLoading}
                    className="w-8 h-8 rounded-xl grid place-items-center shrink-0 transition-all"
                    style={{
                      background: chatInput.trim() ? 'linear-gradient(135deg,#E0C26A,#C9A84C)' : 'var(--tf-card-inner)',
                      border: '1px solid var(--tf-border)',
                    }}>
                    <Send size={12} color={chatInput.trim() ? '#1F2329' : 'var(--tf-muted)'} />
                  </button>
                </div>
              </div>
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

          {/* ROW 5 — Save */}
          {saved && <p className="text-xs font-mono text-center" style={{ color: '#4ADE80' }}>✓ Strategy saved.</p>}

          <button onClick={saveStrategy} disabled={!form.entry_rules}
            className="btn-gold rounded-xl py-4 text-sm font-semibold w-full tf-fade-in" style={{ animationDelay: '0.5s' }}>
            Save Strategy
          </button>

          {/* Strategy History */}
          {history.length > 0 && (
            <div className="tf-fade-in" style={{ animationDelay: '0.6s' }}>
              <div className="text-center mb-4">
                <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--tf-text)' }}>Strategy History</h2>
                <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 10px rgba(201,168,76,.4)' }} />
              </div>
              <div className="space-y-3">
                {history.map((h) => {
                  const hColor = h.ai_score >= 8 ? '#4ADE80' : h.ai_score >= 6 ? '#C9A84C' : '#F87171'
                  const isOpen = expandedId === h.id
                  return (
                    <div key={h.id} className="rounded-2xl overflow-hidden tf-card-bg"
                      style={{ boxShadow: 'inset 0 1px 80px rgba(201,168,76,.05), 0 0 0 1px rgba(201,168,76,.12)' }}>
                      {/* Row header — always visible */}
                      <button className="w-full flex items-center gap-4 px-5 py-4 text-left transition-all hover:opacity-90"
                        onClick={() => setExpandedId(isOpen ? null : h.id)}>
                        {/* Score badge */}
                        <div className="w-12 h-12 shrink-0 rounded-xl flex flex-col items-center justify-center"
                          style={{ background: `${hColor}18`, border: `1px solid ${hColor}40` }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: hColor, lineHeight: 1 }}>{h.ai_score}</span>
                          <span className="text-[9px]" style={{ color: 'var(--tf-subtle)' }}>/10</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold" style={{ color: 'var(--tf-text)' }}>{h.style || 'Strategy'}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                              style={{ background: `${hColor}15`, color: hColor, border: `1px solid ${hColor}35` }}>
                              {h.ai_confirmation}
                            </span>
                          </div>
                          <p className="text-[11px] truncate" style={{ color: 'var(--tf-subtle)' }}>
                            {new Date(h.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {h.pairs?.length > 0 && ` · ${h.pairs.slice(0,3).join(', ')}`}
                          </p>
                        </div>
                        <span className="text-xs shrink-0" style={{ color: 'var(--tf-subtle)' }}>{isOpen ? '▲' : '▼'}</span>
                      </button>

                      {/* Expanded detail */}
                      {isOpen && (
                        <div className="px-5 pb-5 space-y-3" style={{ borderTop: '1px solid var(--tf-border)' }}>
                          <p className="text-xs leading-relaxed pt-3" style={{ color: 'var(--tf-muted)' }}>{h.ai_explanation}</p>
                          {h.ai_strengths?.length > 0 && (
                            <div className="rounded-xl p-3" style={{ background: 'rgba(74,222,128,.06)', border: '1px solid rgba(74,222,128,.15)' }}>
                              <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: '#4ADE80' }}>Strengths</div>
                              {h.ai_strengths.map((s, i) => (
                                <div key={i} className="text-[11px] mb-1 flex gap-1.5" style={{ color: 'var(--tf-muted)' }}>
                                  <span style={{ color: '#4ADE80' }}>✓</span>{s}
                                </div>
                              ))}
                            </div>
                          )}
                          {h.ai_risks?.length > 0 && (
                            <div className="rounded-xl p-3" style={{ background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.15)' }}>
                              <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: '#F87171' }}>Mistakes & Risks</div>
                              {h.ai_risks.map((r, i) => (
                                <div key={i} className="text-[11px] mb-1 flex gap-1.5" style={{ color: 'var(--tf-muted)' }}>
                                  <span style={{ color: '#F87171' }}>⚠</span>{r}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
