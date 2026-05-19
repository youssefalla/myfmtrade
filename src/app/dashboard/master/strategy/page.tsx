'use client'

import { useEffect, useRef, useState } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import { Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { Profile } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'
const CHART_PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'US30', 'NAS100', 'USOIL', 'XAGUSD']

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

function extractStrategy(content: string) {
  const m = content.match(/<STRATEGY_DATA>([\s\S]*?)<\/STRATEGY_DATA>/)
  if (!m) return null
  try { return JSON.parse(m[1].trim()) } catch { return null }
}

function cleanContent(content: string) {
  return content.replace(/<STRATEGY_DATA>[\s\S]*?<\/STRATEGY_DATA>/, '').trim()
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="text-center mb-4">
      <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--tf-text)' }}>{title}</h2>
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 10px rgba(201,168,76,.4)' }} />
    </div>
  )
}

export default function StrategyPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartPair, setChartPair] = useState('XAUUSD')

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([INITIAL_MSG])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [selectedChips, setSelectedChips] = useState<string[]>([])
  const [strategySaved, setStrategySaved] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // step = number of AI messages (initial counts as step 1)
  const aiCount = chatMessages.filter(m => m.role === 'assistant').length
  const currentStep = Math.min(aiCount, 5)
  const chips = STEP_CHIPS[currentStep] ?? []
  const isMultiChip = currentStep <= 2

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const [pRes, hRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('strategy_history').select('*').eq('master_id', user.id).order('created_at', { ascending: false }).limit(20),
      ])

      setProfile(pRes.data)
      setHistory((hRes.data ?? []) as HistoryEntry[])
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
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated.filter(m => m.role === 'user' || m.role === 'assistant'),
          mode: 'builder',
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const stratData = extractStrategy(data.content)
      const displayContent = cleanContent(data.content)

      setChatMessages(prev => [...prev, { role: 'assistant', content: displayContent }])

      if (stratData) {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('strategies').upsert(
            { master_id: user.id, ...stratData },
            { onConflict: 'master_id' }
          )
          setStrategySaved(true)
        }
      }
    } catch (e) {
      setChatError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setChatLoading(false)
    }
  }

  function toggleChip(chip: string) {
    if (!isMultiChip) {
      sendChat(chip)
      return
    }
    setSelectedChips(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    )
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center tf-page">
      <div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div>
    </div>
  )

  return (
    <div className="h-screen flex overflow-hidden tf-page" style={{ fontFamily: SYS }}>
      <MasterSidebar profile={profile} onAvatarChange={url => setProfile(p => p ? { ...p, avatar_url: url } : p)} />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <div className="text-center tf-fade-in" style={{ animationDelay: '0s' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }}>Strategy Intelligence</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--tf-subtle)' }}>AI-guided strategy builder — built with you, step by step.</p>
            <div className="mt-3" style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 12px rgba(201,168,76,.45)' }} />
          </div>

          {/* Chart + Builder */}
          <div className="grid grid-cols-3 gap-4 tf-fade-in" style={{ animationDelay: '0.1s' }}>

            {/* Chart */}
            <div className="rounded-2xl overflow-hidden tf-card-bg col-span-2"
              style={{ boxShadow: 'inset 0 1px 80px rgba(201,168,76,.05), 0 0 0 1px rgba(201,168,76,.12)' }}>
              <div className="px-4 pt-4 pb-0">
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
                style={{ width: '100%', height: 480, border: 'none' }}
                allowTransparency allowFullScreen />
            </div>

            {/* AI Strategy Builder */}
            <div className="col-span-1 rounded-2xl flex flex-col overflow-hidden tf-card-bg"
              style={{ boxShadow: 'inset 0 1px 80px rgba(201,168,76,.05), 0 0 0 1px rgba(201,168,76,.12)', height: 540 }}>

              {/* Header */}
              <div className="px-4 pt-4 pb-3 shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>Strategy Builder</span>
                  {strategySaved ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.2)', color: '#4ADE80' }}>
                      ✓ Saved
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <div key={s} className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                          style={{ background: s <= currentStep ? '#C9A84C' : 'rgba(201,168,76,.2)' }} />
                      ))}
                      <span className="text-[10px] font-mono" style={{ color: 'var(--tf-subtle)' }}>{currentStep}/5</span>
                    </div>
                  )}
                </div>
                {!strategySaved && currentStep <= 5 && (
                  <div className="text-[10px] font-mono mb-2" style={{ color: '#C9A84C' }}>
                    Step {currentStep}: {STEP_LABELS[currentStep - 1]}
                  </div>
                )}
                <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 10px rgba(201,168,76,.4)' }} />
              </div>

              {/* Messages */}
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
                {chatError && (
                  <p className="text-[10px] text-center font-mono py-1" style={{ color: '#F87171' }}>{chatError}</p>
                )}
                {strategySaved && (
                  <div className="rounded-xl p-3 text-center"
                    style={{ background: 'rgba(74,222,128,.06)', border: '1px solid rgba(74,222,128,.15)' }}>
                    <div className="text-[11px] font-semibold mb-1" style={{ color: '#4ADE80' }}>Strategy saved!</div>
                    <div className="text-[10px]" style={{ color: 'var(--tf-subtle)' }}>You can continue chatting to refine it.</div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Step chips */}
              {chips.length > 0 && !strategySaved && (
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

              {/* Input */}
              <div className="px-3 pb-3 pt-2 shrink-0" style={{ borderTop: '1px solid var(--tf-border)' }}>
                <div className="flex gap-2 items-center">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                    placeholder={chips.length > 0 && !strategySaved ? 'Select above or type…' : 'Ask anything…'}
                    className="flex-1 rounded-xl px-3 py-2 text-[11px] outline-none tf-input"
                  />
                  <button
                    onClick={() => sendChat()}
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
            </div>
          </div>

          {/* Strategy History */}
          {history.length > 0 && (
            <div className="tf-fade-in" style={{ animationDelay: '0.2s' }}>
              <SectionHeading title="Strategy History" />
              <div className="space-y-3">
                {history.map((h) => {
                  const hColor = h.ai_score >= 8 ? '#4ADE80' : h.ai_score >= 6 ? '#C9A84C' : '#F87171'
                  const isOpen = expandedId === h.id
                  return (
                    <div key={h.id} className="rounded-2xl overflow-hidden tf-card-bg"
                      style={{ boxShadow: 'inset 0 1px 80px rgba(201,168,76,.05), 0 0 0 1px rgba(201,168,76,.12)' }}>
                      <button className="w-full flex items-center gap-4 px-5 py-4 text-left"
                        onClick={() => setExpandedId(isOpen ? null : h.id)}>
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
                            {h.pairs?.length > 0 && ` · ${h.pairs.slice(0, 3).join(', ')}`}
                          </p>
                        </div>
                        <span className="text-xs shrink-0" style={{ color: 'var(--tf-subtle)' }}>{isOpen ? '▲' : '▼'}</span>
                      </button>
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
