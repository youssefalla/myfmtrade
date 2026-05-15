'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { Gig } from '@/types/database'

const FILTERS = ['All', 'Forex', 'Gold', 'Indices', 'Crypto', 'Oil', 'Scalping', 'Swing']

export default function Marketplace() {
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('roi')
  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())
  const [following, setFollowing] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)

      const [gigsRes, followsRes] = await Promise.all([
        supabase.from('gigs').select('*, profiles(*)').eq('is_active', true).order('roi_30d', { ascending: false }),
        user ? supabase.from('follows').select('master_id').eq('trader_id', user.id) : Promise.resolve({ data: [] }),
      ])
      setGigs((gigsRes.data ?? []) as Gig[])
      const ids = new Set((followsRes.data ?? []).map((f: { master_id: string }) => f.master_id))
      setFollowedIds(ids)
      setLoading(false)
    }
    load()
  }, [])

  async function handleFollow(masterId: string) {
    if (!userId) { window.location.href = '/login'; return }
    if (following.has(masterId)) return

    setFollowing(s => new Set(s).add(masterId))
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    if (followedIds.has(masterId)) {
      await supabase.from('follows').delete().eq('trader_id', userId).eq('master_id', masterId)
      setFollowedIds(s => { const n = new Set(s); n.delete(masterId); return n })
    } else {
      await supabase.from('follows').upsert({ trader_id: userId, master_id: masterId }, { onConflict: 'trader_id,master_id' })
      setFollowedIds(s => new Set(s).add(masterId))
    }
    setFollowing(s => { const n = new Set(s); n.delete(masterId); return n })
  }

  const filtered = gigs.filter(g => {
    if (filter === 'All') return true
    return g.instruments?.includes(filter) || g.style?.includes(filter)
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'roi') return b.roi_30d - a.roi_30d
    if (sort === 'win') return b.win_rate - a.win_rate
    return 0
  })

  return (
    <div className="min-h-screen tf-page">
      {/* Nav */}
      <header className="sticky top-0 z-40 px-6 py-4 tf-nav-header">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14.5" stroke="#C9A84C" strokeWidth="1"/><path d="M22 9 A 11 11 0 1 0 22 23 A 8 8 0 1 1 22 9 Z" fill="#C9A84C"/><path d="M11 21 L21 11 M16 11 H21 V16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, color: 'var(--tf-text)' }}>Trade<span style={{ color: '#C9A84C' }}>Flow</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/copy" className="text-sm font-mono" style={{ color: 'var(--tf-muted)' }}>← My Dashboard</Link>
            <ThemeToggle />
            {!userId && <Link href="/login" className="btn-gold rounded-full px-4 py-2 text-sm font-semibold">Login to Copy</Link>}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="text-xs tracking-[0.22em] uppercase font-mono mb-3" style={{ color: '#C9A84C' }}>↗ Traders Offers & Gigs</div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 700, color: 'var(--tf-text)', lineHeight: 1.1 }}>
            {loading ? 'Loading…' : `${sorted.length} Verified Master${sorted.length !== 1 ? 's' : ''}`}<br/>to Copy
          </h1>
          <p className="mt-4 text-sm max-w-xl" style={{ color: 'var(--tf-muted)' }}>All traders are KYC verified with audited track records. Filter by style, ROI, and instruments.</p>
        </div>

        {/* Filters + Sort */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="rounded-full px-4 py-1.5 text-xs font-mono transition-all"
                style={{ border: filter === f ? '1px solid #C9A84C' : '1px solid var(--tf-border)', background: filter === f ? 'rgba(201,168,76,.15)' : 'transparent', color: filter === f ? '#C9A84C' : 'var(--tf-muted)' }}>
                {f}
              </button>
            ))}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="rounded-full px-4 py-1.5 text-xs font-mono outline-none"
            style={{ border: '1px solid var(--tf-border)', background: 'var(--tf-card)', color: 'var(--tf-muted)' }}>
            <option value="roi">Sort: Best ROI</option>
            <option value="win">Sort: Win Rate</option>
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-20 text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading traders…</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm mb-2" style={{ color: 'var(--tf-subtle)' }}>No traders available yet.</p>
            <p className="text-xs" style={{ color: 'var(--tf-subtle)' }}>Be the first — <Link href="/signup?role=master" style={{ color: '#C9A84C' }}>apply as a master trader</Link>.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sorted.map(gig => {
              const p = gig.profiles
              const init = p?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'
              const isFollowed = followedIds.has(gig.master_id)
              const isLoading = following.has(gig.master_id)
              return (
                <div key={gig.id} className="ai-card p-6 flex flex-col relative" style={{ minHeight: 340 }}>
                  <div className="ai-content h-full flex flex-col">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full shrink-0 overflow-hidden grid place-items-center font-bold text-xl"
                        style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)', color: '#1F2329', fontFamily: 'var(--font-syne)', boxShadow: '0 8px 20px rgba(201,168,76,.2)' }}>
                        {p?.avatar_url ? (
                          <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
                        ) : init}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-base truncate" style={{ color: '#F0EDE8', fontFamily: 'var(--font-syne)' }}>{p?.full_name ?? '—'}</div>
                        <div className="text-xs font-mono mt-0.5" style={{ color: 'rgba(240,237,232,.45)' }}>
                          {p?.city ? `${p.city} · ` : ''}{gig.style ?? 'Trader'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex items-end gap-3">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(240,237,232,.45)' }}>30D ROI</div>
                        <div style={{ fontFamily: 'var(--font-syne)', fontSize: '2.5rem', color: '#4ADE80', fontWeight: 700, lineHeight: 1 }}>
                          {gig.roi_30d > 0 ? `+${gig.roi_30d}%` : '—'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4">
                      {[
                        { l: 'Win Rate', v: gig.win_rate ? `${gig.win_rate}%` : '—' },
                        { l: 'Instruments', v: gig.instruments?.length ? gig.instruments[0] : '—' },
                        { l: 'Perf. Fee', v: `${gig.performance_fee}%` },
                      ].map(({ l, v }) => (
                        <div key={l} className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                          <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'rgba(240,237,232,.4)' }}>{l}</div>
                          <div className="text-sm font-semibold mt-0.5" style={{ color: '#F0EDE8', fontFamily: 'var(--font-syne)' }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {p?.bio && (
                      <p className="mt-4 text-xs leading-relaxed line-clamp-2" style={{ color: 'rgba(240,237,232,.5)' }}>{p.bio}</p>
                    )}

                    <div className="mt-auto pt-5">
                      <button
                        onClick={() => handleFollow(gig.master_id)}
                        disabled={isLoading}
                        className="rounded-full w-full py-3 text-sm font-semibold text-center block transition-all"
                        style={isFollowed
                          ? { background: 'rgba(74,222,128,.12)', border: '1px solid rgba(74,222,128,.3)', color: '#4ADE80' }
                          : { background: 'linear-gradient(135deg,#E0C26A,#C9A84C)', color: '#1F2329' }
                        }>
                        {isLoading ? '…' : isFollowed ? '✓ Following' : 'Copy Trader'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Become a master CTA */}
        <div className="mt-16 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{ background: 'linear-gradient(135deg, rgba(201,168,76,.12), rgba(201,168,76,.04))', border: '1px solid rgba(201,168,76,.25)' }}>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: '#C9A84C' }}>For Traders</div>
            <h3 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--tf-text)' }}>Become a Master Trader</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--tf-muted)' }}>Share your signals, earn performance fees, and build your trading brand.</p>
          </div>
          <Link href="/signup?role=master" className="btn-gold rounded-full px-8 py-3.5 text-sm font-semibold shrink-0">Apply Now →</Link>
        </div>
      </div>
    </div>
  )
}
