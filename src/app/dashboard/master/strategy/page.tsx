'use client'

import { useEffect, useRef, useState } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import { Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { Profile } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'
const CHART_PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'US30', 'NAS100', 'USOIL', 'XAGUSD']

type View = 'builder' | 'summary' | 'scored'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface StrategyData {
  pairs: string[]
  timeframes: string[]
  style: string
  entry_rules: string
  risk_management: string
}

interface ScoreResult {
  score: number
  confirmation: string
  explanation: string
  strengths: string[]
  risks: string[]
}

const INITIAL_MSG: ChatMessage = {
  role: 'assistant',
  content: `Hey! I'm your AI strategy coach. Let's build your complete trading strategy together — step by step.\n\n**Step 1 — Trading Pairs** 🎯\nWhich markets do you trade? Select from the chips below or just type them:`,
}

const STEP_CHIPS: Record<number, string[]> = {
  1: ['XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'NAS100', 'US30', 'USOIL', 'XAGUSD'],
  2: ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'],
  3: ['Scalping', 'Day Trading', 'Swing', 'Price Action', 'SMC', 'ICT'],
}

const STEP_LABELS = ['Trading Pairs', 'Timeframes', 'Trading Style', 'Entry Rules', 'Risk Management']

const CONFIRMATION_COLOR: Record<string, string> = {
  'STRONG BUY': '#4ADE80',
  'BUY': '#86EFAC',
  'NEUTRAL': '#C9A84C',
  'SELL': '#FCA5A5',
  'STRONG SELL': '#F87171',
}

function extractStrategy(content: string): StrategyData | null {
  const m = content.match(/<STRATEGY_DATA>([\s\S]*?)<\/STRATEGY_DATA>/)
  if (!m) return null
  try { return JSON.parse(m[1].trim()) } catch { return null }
}

function cleanContent(content: string) {
  return content.replace(/<STRATEGY_DATA>[\s\S]*?<\/STRATEGY_DATA>/, '').trim()
}

export default function StrategyPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartPair, setChartPair] = useState('XAUUSD')

  // Chat builder
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([INITIAL_MSG])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [selectedChips, setSelectedChips] = useState<string[]>([])
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Panel view flow
  const [view, setView] = useState<View>('builder')
  const [strategyData, setStrategyData] = useState<StrategyData | null>(null)
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [scoring, setScoring] = useState(false)
  const [scoreError, setScoreError] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')

  const aiCount = chatMessages.filter(m => m.role === 'assistant').length
  const currentStep = Math.min(aiCount, 5)
  const chips = view === 'builder' ? (STEP_CHIPS[currentStep] ?? []) : []
  const isMultiChip = currentStep <= 2

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const pRes = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(pRes.data)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function sendChat(text?: string) {
    const content = (text ?? (selectedChips.length > 0 ? selectedChips.join(', ') : chatInput)).trim()
    if (!content || chatLoading) return
    setChatInput('')
    setSelectedChips([])
    setChatError('')

    const userMsg: ChatMessage = { role: 'user', content }
    const updated = [...chatMessages, userMsg]
    setChatMessages(updated)
    setChatLoading(true)

    try {
      // Extract pairs selected so far from conversation
      const mentionedPairs = selectedChips.length > 0 ? selectedChips : []

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated,
          mode: 'builder',
          chartPair,
          pairs: mentionedPairs,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const strat = extractStrategy(data.content)
      const displayContent = cleanContent(data.content)
      setChatMessages(prev => [...prev, { role: 'assistant', content: displayContent }])

      if (strat) {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('strategies').upsert({ master_id: user.id, ...strat }, { onConflict: 'master_id' })
        }
        setStrategyData(strat)
        setView('summary')
      }
    } catch (e) {
      setChatError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setChatLoading(false)
    }
  }

  async function scoreStrategy() {
    if (!strategyData) return
    setScoring(true)
    setScoreError('')
    try {
      const res = await fetch('/api/ai/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategyData),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setScoreResult(data)
      setEmailSent(data.emailSent === true)
      setEmailError(data.emailError ?? '')
      setView('scored')
    } catch (e) {
      setScoreError(e instanceof Error ? e.message : 'Scoring failed')
    } finally {
      setScoring(false)
    }
  }

  function toggleChip(chip: string) {
    if (!isMultiChip) { sendChat(chip); return }
    setSelectedChips(prev => prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip])
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center tf-page">
      <div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div>
    </div>
  )

  const scoreColor = scoreResult
    ? (scoreResult.score >= 8 ? '#4ADE80' : scoreResult.score >= 6 ? '#C9A84C' : '#F87171')
    : '#C9A84C'

  return (
    <div className="h-screen flex overflow-hidden tf-page" style={{ fontFamily: SYS }}>
      <MasterSidebar profile={profile} onAvatarChange={url => setProfile(p => p ? { ...p, avatar_url: url } : p)} />

      <main className="flex-1 flex flex-col p-6 md:p-8 overflow-hidden">
        <div className="w-full max-w-[1600px] mx-auto flex flex-col flex-1 gap-5 min-h-0">

          {/* Header */}
          <div className="text-center tf-fade-in shrink-0" style={{ animationDelay: '0s' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }}>Strategy Intelligence</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--tf-subtle)' }}>AI-guided strategy builder — built with you, step by step.</p>
            <div className="mt-3" style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 12px rgba(201,168,76,.45)' }} />
          </div>

          <div className="grid grid-cols-3 gap-4 flex-1 min-h-0 tf-fade-in" style={{ animationDelay: '0.1s' }}>

            {/* Chart */}
            <div className="rounded-2xl overflow-hidden tf-card-bg col-span-2 flex flex-col"
              style={{ boxShadow: 'inset 0 1px 80px rgba(201,168,76,.05), 0 0 0 1px rgba(201,168,76,.12)' }}>
              <div className="px-4 pt-4 pb-0 shrink-0">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>Live Chart</h2>
                  <select value={chartPair} onChange={e => setChartPair(e.target.value)}
                    className="text-xs font-mono rounded-lg px-2 py-1 outline-none"
                    style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)', color: 'var(--tf-muted)' }}>
                    {CHART_PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="mb-2" style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 10px rgba(201,168,76,.4)' }} />
              </div>
              <iframe key={chartPair}
                src={`https://s.tradingview.com/widgetembed/?frameElementId=tv1&symbol=${chartPair}&interval=H1&theme=dark&style=1&locale=en&hide_top_toolbar=false&hide_legend=false&save_image=false&calendar=false`}
                style={{ width: '100%', flex: 1, border: 'none', minHeight: 0 }}
                allowTransparency allowFullScreen />
            </div>

            {/* Right panel */}
            <div className="col-span-1 rounded-2xl flex flex-col overflow-hidden tf-card-bg"
              style={{ boxShadow: 'inset 0 1px 80px rgba(201,168,76,.05), 0 0 0 1px rgba(201,168,76,.12)' }}>

              {/* ── VIEW: BUILDER ── */}
              {view === 'builder' && <>
                <div className="px-4 pt-4 pb-3 shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>Strategy Builder</span>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <div key={s} className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                          style={{ background: s <= currentStep ? '#C9A84C' : 'rgba(201,168,76,.2)' }} />
                      ))}
                      <span className="text-[10px] font-mono" style={{ color: 'var(--tf-subtle)' }}>{currentStep}/5</span>
                    </div>
                  </div>
                  {currentStep <= 5 && (
                    <div className="text-[10px] font-mono mb-2" style={{ color: '#C9A84C' }}>
                      Step {currentStep}: {STEP_LABELS[currentStep - 1]}
                    </div>
                  )}
                  <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 10px rgba(201,168,76,.4)' }} />
                </div>

                <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-2 min-h-0">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'user' ? (
                        <div className="max-w-[90%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed"
                          style={{ background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.25)', color: 'var(--tf-text)', borderBottomRightRadius: 4 }}>
                          {msg.content}
                        </div>
                      ) : (
                        <div className="max-w-[90%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed ai-bubble"
                          style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)', color: 'var(--tf-muted)', borderBottomLeftRadius: 4 }}>
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl px-3 py-2 text-[11px]"
                        style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)', color: 'var(--tf-subtle)', borderBottomLeftRadius: 4 }}>
                        <span className="animate-pulse">Thinking…</span>
                      </div>
                    </div>
                  )}
                  {chatError && <p className="text-[10px] text-center font-mono py-1" style={{ color: '#F87171' }}>{chatError}</p>}
                  <div ref={chatBottomRef} />
                </div>

                {chips.length > 0 && (
                  <div className="px-3 pt-2 pb-1 shrink-0">
                    <div className="flex flex-wrap gap-1.5">
                      {chips.map(chip => (
                        <button key={chip} onClick={() => toggleChip(chip)}
                          className="rounded-full px-2.5 py-1 text-[10px] font-mono transition-all"
                          style={{
                            background: selectedChips.includes(chip) ? 'rgba(201,168,76,.2)' : 'rgba(201,168,76,.05)',
                            border: selectedChips.includes(chip) ? '1px solid rgba(201,168,76,.5)' : '1px solid rgba(201,168,76,.15)',
                            color: selectedChips.includes(chip) ? '#C9A84C' : 'var(--tf-muted)',
                          }}>
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="px-3 pb-3 pt-2 shrink-0" style={{ borderTop: '1px solid var(--tf-border)' }}>
                  <div className="flex gap-2 items-center">
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                      placeholder={chips.length > 0 ? 'Select above or type…' : 'Ask anything…'}
                      className="flex-1 rounded-xl px-3 py-2 text-[11px] outline-none tf-input"
                    />
                    <button onClick={() => sendChat()}
                      disabled={(!chatInput.trim() && selectedChips.length === 0) || chatLoading}
                      className="w-8 h-8 rounded-xl grid place-items-center shrink-0 transition-all"
                      style={{
                        background: (chatInput.trim() || selectedChips.length > 0) ? 'linear-gradient(135deg,#E0C26A,#C9A84C)' : 'var(--tf-card-inner)',
                        border: '1px solid var(--tf-border)',
                      }}>
                      <Send size={12} color={(chatInput.trim() || selectedChips.length > 0) ? '#1F2329' : 'var(--tf-muted)'} />
                    </button>
                  </div>
                </div>
              </>}

              {/* ── VIEW: SUMMARY ── */}
              {view === 'summary' && strategyData && <>
                <div className="px-4 pt-4 pb-3 shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>Your Strategy</span>
                    <button onClick={() => setView('builder')}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full transition-opacity hover:opacity-70"
                      style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)', color: 'var(--tf-subtle)' }}>
                      ← Edit
                    </button>
                  </div>
                  <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 10px rgba(201,168,76,.4)' }} />
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3 min-h-0">
                  {/* Tags row */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {strategyData.pairs?.map(p => (
                      <span key={p} className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.2)', color: '#C9A84C' }}>{p}</span>
                    ))}
                    {strategyData.timeframes?.map(t => (
                      <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(201,168,76,.06)', border: '1px solid rgba(201,168,76,.15)', color: 'var(--tf-muted)' }}>{t}</span>
                    ))}
                    {strategyData.style && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.2)', color: '#A78BFA' }}>{strategyData.style}</span>
                    )}
                  </div>

                  {/* Entry Rules */}
                  <div className="rounded-xl p-3" style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)' }}>
                    <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: '#C9A84C' }}>Entry Rules</div>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--tf-muted)', whiteSpace: 'pre-wrap' }}>{strategyData.entry_rules}</p>
                  </div>

                  {/* Risk Management */}
                  <div className="rounded-xl p-3" style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)' }}>
                    <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: '#C9A84C' }}>Risk Management</div>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--tf-muted)', whiteSpace: 'pre-wrap' }}>{strategyData.risk_management}</p>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-3 shrink-0" style={{ borderTop: '1px solid var(--tf-border)' }}>
                  {scoreError && <p className="text-[10px] font-mono text-center mb-2" style={{ color: '#F87171' }}>{scoreError}</p>}
                  <button onClick={scoreStrategy} disabled={scoring}
                    className="w-full rounded-xl py-3 text-sm font-semibold transition-all btn-gold"
                    style={{ opacity: scoring ? 0.7 : 1 }}>
                    {scoring ? '🤖 Scoring your strategy…' : '🤖 Score My Strategy'}
                  </button>
                </div>
              </>}

              {/* ── VIEW: SCORED ── */}
              {view === 'scored' && scoreResult && <>
                <div className="px-4 pt-4 pb-3 shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>Strategy Scored</span>
                    <button onClick={() => setView('summary')}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)', color: 'var(--tf-subtle)' }}>
                      ← Back
                    </button>
                  </div>
                  <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 10px rgba(201,168,76,.4)' }} />
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0 flex flex-col gap-4 pt-4">
                  {/* Score display */}
                  <div className="rounded-2xl p-5 text-center"
                    style={{ background: `${scoreColor}10`, border: `1px solid ${scoreColor}30` }}>
                    <div style={{ fontSize: '3.5rem', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{scoreResult.score}</div>
                    <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--tf-subtle)' }}>out of 10</div>
                    <div className="mt-3 inline-flex px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: `${CONFIRMATION_COLOR[scoreResult.confirmation] ?? '#C9A84C'}18`, color: CONFIRMATION_COLOR[scoreResult.confirmation] ?? '#C9A84C', border: `1px solid ${CONFIRMATION_COLOR[scoreResult.confirmation] ?? '#C9A84C'}35` }}>
                      {scoreResult.confirmation}
                    </div>
                  </div>

                  {/* Explanation */}
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--tf-muted)' }}>{scoreResult.explanation}</p>

                  {/* Strengths */}
                  {scoreResult.strengths?.length > 0 && (
                    <div className="rounded-xl p-3" style={{ background: 'rgba(74,222,128,.06)', border: '1px solid rgba(74,222,128,.15)' }}>
                      <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: '#4ADE80' }}>Strengths</div>
                      {scoreResult.strengths.map((s, i) => (
                        <div key={i} className="text-[11px] mb-1.5 flex gap-1.5" style={{ color: 'var(--tf-muted)' }}>
                          <span style={{ color: '#4ADE80' }}>✓</span>{s}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Risks */}
                  {scoreResult.risks?.length > 0 && (
                    <div className="rounded-xl p-3" style={{ background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.15)' }}>
                      <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: '#F87171' }}>Risks</div>
                      {scoreResult.risks.map((r, i) => (
                        <div key={i} className="text-[11px] mb-1.5 flex gap-1.5" style={{ color: 'var(--tf-muted)' }}>
                          <span style={{ color: '#F87171' }}>⚠</span>{r}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Email confirmation */}
                  <div className="rounded-xl p-3 flex items-center gap-3"
                    style={{
                      background: emailSent ? 'rgba(74,222,128,.06)' : 'rgba(248,113,113,.06)',
                      border: emailSent ? '1px solid rgba(74,222,128,.15)' : '1px solid rgba(248,113,113,.15)',
                    }}>
                    <div className="w-8 h-8 rounded-full grid place-items-center shrink-0"
                      style={{ background: emailSent ? 'rgba(74,222,128,.15)' : 'rgba(248,113,113,.15)' }}>
                      <span style={{ fontSize: 14 }}>{emailSent ? '✉️' : '⚠️'}</span>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold" style={{ color: emailSent ? '#4ADE80' : '#F87171' }}>
                        {emailSent ? 'Score report sent!' : 'Email not sent'}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--tf-subtle)' }}>
                        {emailSent
                          ? 'Check your email for the full analysis.'
                          : emailError || 'Check RESEND_FROM_EMAIL env var — domain must be verified in Resend.'}
                      </div>
                    </div>
                  </div>

                  <a href="/dashboard/master/history"
                    className="text-center text-[11px] font-mono py-2 rounded-xl transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.2)', color: '#C9A84C', display: 'block' }}>
                    View in Strategy History →
                  </a>
                </div>
              </>}

            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
