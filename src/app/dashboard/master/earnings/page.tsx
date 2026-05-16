'use client'

import { useEffect, useState } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import type { Profile } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

export default function EarningsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subCount, setSubCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const [pRes, sRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('subscriptions').select('id', { count: 'exact' }).eq('master_id', user.id).eq('status', 'active'),
      ])
      setProfile(pRes.data)
      setSubCount(sRes.count ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  const PRICE = 35
  const MASTER_SHARE = 0.95
  const monthlyRevenue = subCount * PRICE * MASTER_SHARE

  if (loading) return <div className="min-h-screen flex items-center justify-center tf-page"><div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div></div>

  return (
    <div className="min-h-screen flex tf-page" style={{ fontFamily: SYS }}>
      <MasterSidebar profile={profile} onAvatarChange={url => setProfile(p => p ? { ...p, avatar_url: url } : p)} />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <h1 style={{ fontFamily: SYS, fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }} className="mb-8">Earnings</h1>

          {/* Main revenue card */}
          <div className="rounded-2xl p-8 mb-6" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,.15), rgba(201,168,76,.05))', border: '1px solid rgba(201,168,76,.3)' }}>
            <div className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: '#C9A84C' }}>Monthly Revenue</div>
            <div style={{ fontFamily: SYS, fontSize: '3rem', fontWeight: 700, color: '#C9A84C', letterSpacing: '-0.03em' }}>
              ${monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-2 text-sm" style={{ color: 'var(--tf-muted)' }}>
              {subCount} subscriber{subCount !== 1 ? 's' : ''} × $35 × 95% your share
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Active Subscribers', value: String(subCount), color: 'var(--tf-text)' },
              { label: 'Per Subscriber', value: `$${(PRICE * MASTER_SHARE).toFixed(2)}`, color: '#C9A84C' },
              { label: 'Platform Fee', value: '5%', color: 'var(--tf-subtle)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl p-5 tf-card-bg">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-subtle)' }}>{label}</div>
                <div style={{ fontFamily: SYS, fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Projection table */}
          <div className="rounded-2xl p-6 tf-card-bg">
            <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--tf-text)' }}>Revenue Projection</h2>
            <div className="space-y-3">
              {[10, 25, 50, 100, 250].map(n => (
                <div key={n} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--tf-border)' }}>
                  <div className="text-sm" style={{ color: 'var(--tf-muted)' }}>{n} subscribers</div>
                  <div className="font-semibold" style={{ color: n <= subCount ? '#4ADE80' : 'var(--tf-text)', fontFamily: SYS }}>
                    ${(n * PRICE * MASTER_SHARE).toLocaleString('en-US', { minimumFractionDigits: 0 })}/mo
                    {n <= subCount && <span className="ml-2 text-xs" style={{ color: '#4ADE80' }}>✓ reached</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
