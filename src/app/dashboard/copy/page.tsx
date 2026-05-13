'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LayoutDashboard, Users, TrendingUp, Banknote, BookOpen, Settings } from 'lucide-react'
import type { Gig, Trade } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',  href: '/dashboard/copy', active: true },
  { icon: Users,           label: 'My Traders', href: '/marketplace' },
  { icon: TrendingUp,      label: 'My Trades',  href: '/dashboard/copy' },
  { icon: Banknote,        label: 'Rebates',    href: '/dashboard/copy' },
  { icon: BookOpen,        label: 'Courses',    href: '/dashboard/copy' },
  { icon: Settings,        label: 'Settings',   href: '/dashboard/copy' },
]

export default function CopyDashboard() {
  const [followedGigs, setFollowedGigs] = useState<Gig[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      // Get followed masters
      const { data: follows } = await supabase
        .from('follows')
        .select('master_id')
        .eq('trader_id', user.id)

      const masterIds = (follows ?? []).map(f => f.master_id)

      if (masterIds.length > 0) {
        const [gigsRes, tradesRes] = await Promise.all([
          supabase.from('gigs').select('*, profiles(*)').in('master_id', masterIds),
          supabase.from('trades').select('*').in('master_id', masterIds).order('opened_at', { ascending: false }).limit(20),
        ])
        setFollowedGigs((gigsRes.data ?? []) as Gig[])
        setTrades(tradesRes.data ?? [])
      }

      setLoading(false)
    }
    load()
  }, [])

  const totalPips = trades.reduce((s, t) => s + (t.pnl_pips ?? 0), 0)
  const closed = trades.filter(t => t.result !== 'OPEN')
  const wins = closed.filter(t => t.result === 'WIN').length
  const winRate = closed.length ? Math.round(wins / closed.length * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center tf-page">
        <div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex tf-page" style={{ fontFamily: SYS }}>
      {/* Sidebar */}
      <aside className="w-64 hidden md:flex flex-col p-6 gap-6 shrink-0 tf-sidebar">
        <Link href="/" className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14.5" stroke="#C9A84C" strokeWidth="1"/><path d="M22 9 A 11 11 0 1 0 22 23 A 8 8 0 1 1 22 9 Z" fill="#C9A84C"/><path d="M11 21 L21 11 M16 11 H21 V16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{ fontFamily: SYS, fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.02em' }}>Trade<span style={{ color: '#C9A84C' }}>Flow</span></span>
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map(({ icon: Icon, label, href, active }) => (
            <Link key={label} href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{ background: active ? 'rgba(201,168,76,.12)' : 'transparent', color: active ? '#C9A84C' : 'var(--tf-muted)', border: active ? '1px solid rgba(201,168,76,.2)' : '1px solid transparent' }}>
              <Icon size={16} strokeWidth={1.7} /><span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-between">
          <Link href="/marketplace" className="btn-gold rounded-xl py-2 px-4 text-sm font-semibold text-center flex-1 mr-2">+ Add Trader</Link>
          <ThemeToggle />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 style={{ fontFamily: SYS, fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }}>My Dashboard</h1>
              <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: 'var(--tf-subtle)' }}>
                <span className="live-dot"></span> {followedGigs.length > 0 ? 'Copy Trading Active' : 'No traders followed yet'}
              </div>
            </div>
            <Link href="/marketplace" className="btn-outline rounded-full px-4 py-2 text-sm">Browse Traders</Link>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Pips',     value: totalPips > 0 ? `+${totalPips}` : totalPips.toString(), color: totalPips >= 0 ? '#4ADE80' : '#F87171', sub: 'All time' },
              { label: 'Copied Trades',  value: trades.length.toString(), color: 'var(--tf-text)', sub: 'All traders' },
              { label: 'Win Rate',       value: closed.length ? `${winRate}%` : '—', color: '#C9A84C', sub: `${closed.length} closed` },
              { label: 'Masters Copied', value: followedGigs.length.toString(), color: '#E8C97A', sub: 'Active' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="rounded-2xl p-5 tf-card-bg">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-subtle)', letterSpacing: '0.08em' }}>{label}</div>
                <div style={{ fontFamily: SYS, fontSize: '1.5rem', fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--tf-subtle)' }}>{sub}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* My Traders */}
            <div className="rounded-2xl p-6 tf-card-bg">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold" style={{ fontFamily: SYS, color: 'var(--tf-text)', letterSpacing: '-0.02em' }}>My Traders</h2>
                <Link href="/marketplace" className="text-xs" style={{ color: '#C9A84C' }}>+ Add more</Link>
              </div>
              {followedGigs.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm mb-4" style={{ color: 'var(--tf-subtle)' }}>You&apos;re not following any traders yet.</p>
                  <Link href="/marketplace" className="btn-gold rounded-full px-5 py-2 text-sm font-semibold">Browse Marketplace</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {followedGigs.map(gig => {
                    const p = gig.profiles
                    const init = p?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'
                    return (
                      <div key={gig.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)' }}>
                        <div className="w-10 h-10 rounded-full grid place-items-center font-bold shrink-0" style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)', color: '#1F2329', fontFamily: SYS }}>{init}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: 'var(--tf-text)' }}>{p?.full_name ?? '—'}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--tf-subtle)' }}>{gig.style ?? 'Trader'} · {gig.performance_fee}% fee</div>
                        </div>
                        <div className="text-right">
                          <div style={{ color: '#4ADE80', fontFamily: SYS, fontWeight: 600 }}>{gig.roi_30d ? `+${gig.roi_30d}%` : '—'}</div>
                          <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: '#4ADE80' }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }}></span> active
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Recent Trades */}
            <div className="rounded-2xl p-6 tf-card-bg">
              <h2 className="mb-5 text-base font-semibold" style={{ fontFamily: SYS, color: 'var(--tf-text)', letterSpacing: '-0.02em' }}>Recent Copied Trades</h2>
              {trades.length === 0 ? (
                <div className="py-8 text-center text-sm" style={{ color: 'var(--tf-subtle)' }}>No trades copied yet.</div>
              ) : (
                <div className="space-y-3">
                  {trades.slice(0, 6).map((t, i) => (
                    <div key={t.id} className="flex items-center gap-3 py-2" style={{ borderBottom: i < 5 ? '1px solid var(--tf-border)' : 'none' }}>
                      <div className="w-8 h-8 rounded-lg grid place-items-center text-xs font-bold"
                        style={{ background: t.direction === 'BUY' ? 'rgba(34,197,94,.12)' : 'rgba(248,113,113,.12)', color: t.direction === 'BUY' ? '#4ADE80' : '#F87171' }}>
                        {t.direction === 'BUY' ? '↑' : '↓'}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium" style={{ color: 'var(--tf-text)', fontFamily: SYS }}>{t.pair}</div>
                        <div className="text-xs" style={{ color: 'var(--tf-subtle)' }}>{new Date(t.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {t.pnl_pips > 0 ? '+' : ''}{t.pnl_pips} pips</div>
                      </div>
                      <div className="text-sm font-semibold" style={{ color: t.result === 'LOSS' ? '#F87171' : '#4ADE80', fontFamily: SYS }}>
                        {t.result}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Marketplace CTA */}
          <div className="mt-6 rounded-2xl p-6 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,.15), rgba(201,168,76,.05))', border: '1px solid rgba(201,168,76,.25)' }}>
            <div>
              <div className="font-semibold" style={{ fontFamily: SYS, color: 'var(--tf-text)', letterSpacing: '-0.02em' }}>Discover more traders</div>
              <div className="text-sm mt-1" style={{ color: 'var(--tf-muted)' }}>Browse verified master traders on the marketplace</div>
            </div>
            <Link href="/marketplace" className="btn-gold rounded-full px-6 py-2.5 text-sm font-semibold shrink-0">Browse All →</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
