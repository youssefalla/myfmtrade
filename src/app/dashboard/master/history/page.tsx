'use client'

import { useEffect, useState } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import type { Profile } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

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
  timeframes: string[]
  entry_rules: string
  risk_management: string
}

export default function HistoryPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const [pRes, hRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('strategy_history').select('*').eq('master_id', user.id).order('created_at', { ascending: false }).limit(50),
      ])

      setProfile(pRes.data)
      setHistory((hRes.data ?? []) as HistoryEntry[])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center tf-page">
      <div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div>
    </div>
  )

  return (
    <div className="h-screen flex overflow-hidden tf-page" style={{ fontFamily: SYS }}>
      <MasterSidebar profile={profile} onAvatarChange={url => setProfile(p => p ? { ...p, avatar_url: url } : p)} />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Header */}
          <div className="text-center tf-fade-in" style={{ animationDelay: '0s' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }}>Strategy History</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--tf-subtle)' }}>All your AI-scored strategies, from newest to oldest.</p>
            <div className="mt-3" style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 12px rgba(201,168,76,.45)' }} />
          </div>

          {/* Empty state */}
          {history.length === 0 && (
            <div className="text-center py-20 tf-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="text-4xl mb-4">📋</div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--tf-text)' }}>No history yet</p>
              <p className="text-xs" style={{ color: 'var(--tf-subtle)' }}>Complete your strategy in the Strategy Builder to see it here.</p>
            </div>
          )}

          {/* History list */}
          <div className="space-y-3 tf-fade-in" style={{ animationDelay: '0.1s' }}>
            {history.map((h) => {
              const hColor = h.ai_score >= 8 ? '#4ADE80' : h.ai_score >= 6 ? '#C9A84C' : '#F87171'
              const isOpen = expandedId === h.id
              return (
                <div key={h.id} className="rounded-2xl overflow-hidden tf-card-bg"
                  style={{ boxShadow: 'inset 0 1px 80px rgba(201,168,76,.05), 0 0 0 1px rgba(201,168,76,.12)' }}>

                  {/* Row header */}
                  <button className="w-full flex items-center gap-4 px-5 py-4 text-left transition-opacity hover:opacity-90"
                    onClick={() => setExpandedId(isOpen ? null : h.id)}>
                    {/* Score badge */}
                    <div className="w-14 h-14 shrink-0 rounded-xl flex flex-col items-center justify-center"
                      style={{ background: `${hColor}18`, border: `1px solid ${hColor}40` }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: hColor, lineHeight: 1 }}>
                        {h.ai_score ?? '—'}
                      </span>
                      <span className="text-[9px] font-mono" style={{ color: 'var(--tf-subtle)' }}>/10</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>{h.style || 'Strategy'}</span>
                        {h.ai_confirmation && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                            style={{ background: `${hColor}15`, color: hColor, border: `1px solid ${hColor}35` }}>
                            {h.ai_confirmation}
                          </span>
                        )}
                        {h.pairs?.length > 0 && h.pairs.slice(0, 3).map(p => (
                          <span key={p} className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.15)', color: '#C9A84C' }}>
                            {p}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px]" style={{ color: 'var(--tf-subtle)' }}>
                        {new Date(h.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {h.timeframes?.length > 0 && ` · ${h.timeframes.join(', ')}`}
                      </p>
                    </div>

                    <span className="text-xs shrink-0" style={{ color: 'var(--tf-subtle)' }}>{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid var(--tf-border)' }}>

                      {/* Explanation */}
                      {h.ai_explanation && (
                        <p className="text-xs leading-relaxed pt-4" style={{ color: 'var(--tf-muted)' }}>{h.ai_explanation}</p>
                      )}

                      {/* Entry rules & Risk */}
                      {(h.entry_rules || h.risk_management) && (
                        <div className="grid grid-cols-2 gap-3">
                          {h.entry_rules && (
                            <div className="rounded-xl p-3" style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)' }}>
                              <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-subtle)' }}>Entry Rules</div>
                              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--tf-muted)' }}>{h.entry_rules}</p>
                            </div>
                          )}
                          {h.risk_management && (
                            <div className="rounded-xl p-3" style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)' }}>
                              <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-subtle)' }}>Risk Management</div>
                              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--tf-muted)' }}>{h.risk_management}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Strengths & Risks */}
                      {(h.ai_strengths?.length > 0 || h.ai_risks?.length > 0) && (
                        <div className="grid grid-cols-2 gap-3">
                          {h.ai_strengths?.length > 0 && (
                            <div className="rounded-xl p-3" style={{ background: 'rgba(74,222,128,.06)', border: '1px solid rgba(74,222,128,.15)' }}>
                              <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: '#4ADE80' }}>Strengths</div>
                              {h.ai_strengths.map((s, i) => (
                                <div key={i} className="text-[11px] mb-1.5 flex gap-1.5" style={{ color: 'var(--tf-muted)' }}>
                                  <span style={{ color: '#4ADE80' }}>✓</span>{s}
                                </div>
                              ))}
                            </div>
                          )}
                          {h.ai_risks?.length > 0 && (
                            <div className="rounded-xl p-3" style={{ background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.15)' }}>
                              <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: '#F87171' }}>Mistakes & Risks</div>
                              {h.ai_risks.map((r, i) => (
                                <div key={i} className="text-[11px] mb-1.5 flex gap-1.5" style={{ color: 'var(--tf-muted)' }}>
                                  <span style={{ color: '#F87171' }}>⚠</span>{r}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

        </div>
      </main>
    </div>
  )
}
