'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LayoutDashboard, Eye, Users, TrendingUp, Banknote, Radio, Settings, Plus } from 'lucide-react'
import type { Profile, Gig, Trade } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'
const INSTRUMENTS = ['Forex', 'Gold', 'Indices', 'Crypto', 'Oil', 'Stocks']

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',   href: '/dashboard/master', active: true },
  { icon: Eye,             label: 'Gig Profile', href: '/dashboard/master' },
  { icon: Users,           label: 'Followers',   href: '/dashboard/master' },
  { icon: TrendingUp,      label: 'My Trades',   href: '/dashboard/master' },
  { icon: Banknote,        label: 'Earnings',    href: '/dashboard/master' },
  { icon: Radio,           label: 'Community',   href: '/marketplace' },
  { icon: Settings,        label: 'Settings',    href: '/dashboard/master' },
]

export default function MasterDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [gig, setGig] = useState<Gig | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [followerCount, setFollowerCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Gig creation form state
  const [showGigForm, setShowGigForm] = useState(false)
  const [gigForm, setGigForm] = useState({ city: '', bio: '', style: '', instruments: [] as string[], fee: '10' })
  const [saving, setSaving] = useState(false)
  const [gigError, setGigError] = useState('')

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const [profileRes, gigRes, tradesRes, followsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('gigs').select('*').eq('master_id', user.id).single(),
        supabase.from('trades').select('*').eq('master_id', user.id).order('opened_at', { ascending: false }).limit(10),
        supabase.from('follows').select('id', { count: 'exact' }).eq('master_id', user.id),
      ])

      setProfile(profileRes.data)
      setGig(gigRes.data)
      setTrades(tradesRes.data ?? [])
      setFollowerCount(followsRes.count ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  async function saveGig() {
    setSaving(true); setGigError('')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update profile city/bio
      await supabase.from('profiles').update({ city: gigForm.city || null, bio: gigForm.bio || null }).eq('id', user.id)

      // Upsert gig
      const { data, error } = await supabase.from('gigs').upsert({
        master_id: user.id,
        style: [gigForm.style, ...gigForm.instruments].filter(Boolean).join(' · ') || null,
        instruments: gigForm.instruments,
        performance_fee: parseInt(gigForm.fee),
        is_active: true,
      }, { onConflict: 'master_id' }).select().single()

      if (error) throw error
      setGig(data)
      if (gigForm.city && profile) setProfile({ ...profile, city: gigForm.city, bio: gigForm.bio || null })
      setShowGigForm(false)
    } catch (e: unknown) {
      setGigError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const initials = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  const winRate = trades.length ? Math.round(trades.filter(t => t.result === 'WIN').length / trades.filter(t => t.result !== 'OPEN').length * 100) || 0 : 0

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

        <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.2)' }}>
          <div className="w-14 h-14 rounded-full grid place-items-center mx-auto mb-3 font-bold text-xl" style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)', color: '#1F2329', fontFamily: SYS }}>{initials}</div>
          <div className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>{profile?.full_name ?? '—'}</div>
          <div className="text-xs mt-0.5" style={{ color: '#C9A84C' }}>Master Trader ✓</div>
          {profile?.city && <div className="text-xs mt-2" style={{ color: 'var(--tf-subtle)' }}>{profile.city}</div>}
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map(({ icon: Icon, label, href, active }) => (
            <Link key={label} href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{ background: active ? 'rgba(201,168,76,.12)' : 'transparent', color: active ? '#C9A84C' : 'var(--tf-muted)', border: active ? '1px solid rgba(201,168,76,.2)' : '1px solid transparent' }}>
              <Icon size={16} strokeWidth={1.7} /><span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/marketplace" className="btn-outline rounded-xl py-2.5 px-4 text-sm font-medium text-center flex-1">View My Gig →</Link>
          <ThemeToggle />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 style={{ fontFamily: SYS, fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }}>Master Dashboard</h1>
              <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: 'var(--tf-subtle)' }}>
                <span className="live-dot"></span> Live · {followerCount} follower{followerCount !== 1 ? 's' : ''} copying you
              </div>
            </div>
            <Link href="/marketplace" className="btn-gold rounded-full px-5 py-2.5 text-sm font-semibold">My Gig Page</Link>
          </div>

          {/* No gig yet — CTA to create one */}
          {!gig && (
            <div className="rounded-2xl p-8 mb-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,.1), rgba(201,168,76,.04))', border: '1px dashed rgba(201,168,76,.4)' }}>
              <div className="w-12 h-12 rounded-full grid place-items-center mx-auto mb-4" style={{ background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.3)' }}>
                <Plus size={22} color="#C9A84C" />
              </div>
              <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: SYS, color: 'var(--tf-text)' }}>Create your gig</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--tf-muted)' }}>Your gig is not live yet. Set it up so followers can find and copy you on the marketplace.</p>
              <button onClick={() => setShowGigForm(true)} className="btn-gold rounded-full px-7 py-3 text-sm font-semibold">Create Gig →</button>
            </div>
          )}

          {/* Gig creation form */}
          {showGigForm && (
            <div className="rounded-2xl p-6 mb-8 tf-card-bg" style={{ border: '1px solid rgba(201,168,76,.3)' }}>
              <h2 className="text-base font-semibold mb-5" style={{ fontFamily: SYS, color: 'var(--tf-text)' }}>{gig ? 'Edit Gig' : 'Create Your Gig'}</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>City</label>
                    <input value={gigForm.city} onChange={e => setGigForm(d => ({ ...d, city: e.target.value }))} placeholder="Casablanca" className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input"/>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Style</label>
                    <select value={gigForm.style} onChange={e => setGigForm(d => ({ ...d, style: e.target.value }))} className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input">
                      <option value="">Select…</option>
                      {['Scalping', 'Day Trading', 'Swing', 'SMC'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Bio</label>
                  <textarea value={gigForm.bio} onChange={e => setGigForm(d => ({ ...d, bio: e.target.value }))} placeholder="I trade SMC on gold with 4 years of live track record." rows={2} className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none tf-input"/>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Instruments</label>
                  <div className="flex flex-wrap gap-2">
                    {INSTRUMENTS.map(inst => {
                      const sel = gigForm.instruments.includes(inst)
                      return (
                        <button key={inst} type="button" onClick={() => setGigForm(d => ({ ...d, instruments: sel ? d.instruments.filter(x => x !== inst) : [...d.instruments, inst] }))}
                          className="rounded-full px-3 py-1.5 text-xs font-mono transition-all"
                          style={{ border: sel ? '1px solid #C9A84C' : '1px solid var(--tf-border)', background: sel ? 'rgba(201,168,76,.15)' : 'transparent', color: sel ? '#C9A84C' : 'var(--tf-muted)' }}>
                          {inst}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--tf-muted)' }}>Performance Fee</label>
                    <span style={{ fontFamily: SYS, fontSize: '1.1rem', fontWeight: 700, color: '#C9A84C' }}>{gigForm.fee}%</span>
                  </div>
                  <input type="range" min="5" max="30" value={gigForm.fee} onChange={e => setGigForm(d => ({ ...d, fee: e.target.value }))} className="w-full accent-[#C9A84C]"/>
                </div>
                {gigError && <p className="text-xs font-mono" style={{ color: '#F87171' }}>{gigError}</p>}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowGigForm(false)} className="btn-outline rounded-xl px-5 py-2.5 text-sm flex-1">Cancel</button>
                  <button onClick={saveGig} disabled={saving} className="btn-gold rounded-xl py-2.5 text-sm font-semibold flex-1">
                    {saving ? 'Saving…' : gig ? 'Update Gig' : 'Publish Gig →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Followers', value: followerCount.toString(), color: 'var(--tf-text)', sub: 'All time' },
              { label: '30D ROI',         value: gig?.roi_30d ? `+${gig.roi_30d}%` : '—',    color: '#4ADE80',        sub: 'Updated daily' },
              { label: 'Perf. Fee',       value: gig ? `${gig.performance_fee}%` : '—',        color: '#C9A84C',        sub: 'Of followers\' profit' },
              { label: 'Win Rate',        value: trades.length ? `${winRate}%` : '—',          color: '#E8C97A',        sub: `${trades.filter(t => t.result !== 'OPEN').length} closed trades` },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="rounded-2xl p-5 tf-card-bg">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-subtle)', letterSpacing: '0.08em' }}>{label}</div>
                <div style={{ fontFamily: SYS, fontSize: '1.5rem', fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--tf-subtle)' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Recent Trades */}
          <div className="rounded-2xl p-6 tf-card-bg mb-6">
            <h2 className="mb-5 text-base font-semibold" style={{ fontFamily: SYS, color: 'var(--tf-text)', letterSpacing: '-0.02em' }}>Recent Trades</h2>
            {trades.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--tf-subtle)' }}>No trades yet. Connect your MT5 to start syncing.</div>
            ) : (
              <div className="space-y-3">
                {trades.map(t => (
                  <div key={t.id} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid var(--tf-border)' }}>
                    <div className="w-8 h-8 rounded-lg grid place-items-center text-xs font-bold"
                      style={{ background: t.result === 'WIN' ? 'rgba(34,197,94,.12)' : t.result === 'LOSS' ? 'rgba(248,113,113,.12)' : 'rgba(201,168,76,.12)', color: t.result === 'WIN' ? '#4ADE80' : t.result === 'LOSS' ? '#F87171' : '#C9A84C' }}>
                      {t.direction === 'BUY' ? '↑' : '↓'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: 'var(--tf-text)', fontFamily: SYS }}>{t.pair}</div>
                      <div className="text-xs" style={{ color: 'var(--tf-subtle)' }}>{new Date(t.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div className="text-sm font-semibold" style={{ color: t.result === 'WIN' ? '#4ADE80' : t.result === 'LOSS' ? '#F87171' : '#C9A84C', fontFamily: SYS }}>
                      {t.pnl_pips > 0 ? '+' : ''}{t.pnl_pips} pips
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gig status + edit */}
          {gig && (
            <div className="rounded-2xl p-6 tf-card-bg">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold" style={{ fontFamily: SYS, color: 'var(--tf-text)' }}>Your Marketplace Gig</h2>
                <button onClick={() => { setGigForm({ city: profile?.city ?? '', bio: profile?.bio ?? '', style: '', instruments: gig.instruments ?? [], fee: gig.performance_fee.toString() }); setShowGigForm(true) }}
                  className="text-xs font-mono px-3 py-1.5 rounded-full transition-all"
                  style={{ border: '1px solid var(--tf-border)', color: 'var(--tf-muted)' }}>
                  Edit
                </button>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: 'Style', value: gig.style ?? '—' },
                  { label: 'Performance Fee', value: `${gig.performance_fee}%` },
                  { label: 'Status', value: gig.is_active ? 'Live' : 'Inactive' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl p-4" style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)' }}>
                    <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#C9A84C' }}>{label}</div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--tf-text)', fontFamily: SYS }}>{value}</div>
                  </div>
                ))}
              </div>
              {gig.instruments?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {gig.instruments.map(inst => (
                    <span key={inst} className="rounded-full px-3 py-1 text-xs font-mono"
                      style={{ border: '1px solid rgba(201,168,76,.3)', background: 'rgba(201,168,76,.08)', color: '#C9A84C' }}>
                      {inst}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
