'use client'

import { useEffect, useState } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import type { Profile } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

const PAIRS = [
  { label: 'XAUUSD', tv: 'OANDA:XAUUSD' },
  { label: 'EURUSD', tv: 'FX:EURUSD' },
  { label: 'GBPUSD', tv: 'FX:GBPUSD' },
  { label: 'USDJPY', tv: 'FX:USDJPY' },
  { label: 'BTCUSD', tv: 'BITSTAMP:BTCUSD' },
  { label: 'ETHUSD', tv: 'BITSTAMP:ETHUSD' },
  { label: 'US30',   tv: 'FOREXCOM:DJI' },
  { label: 'NAS100', tv: 'FOREXCOM:NSXUSD' },
  { label: 'USOIL',  tv: 'NYMEX:CL1!' },
  { label: 'XAGUSD', tv: 'OANDA:XAGUSD' },
  { label: 'GBPJPY', tv: 'FX:GBPJPY' },
  { label: 'AUDUSD', tv: 'FX:AUDUSD' },
]

export default function ChartPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(PAIRS[0])

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
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
    <div className="min-h-screen flex tf-page" style={{ fontFamily: SYS }}>
      <MasterSidebar profile={profile} onAvatarChange={url => setProfile(p => p ? { ...p, avatar_url: url } : p)} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Pair selector bar */}
        <div className="shrink-0 px-4 py-3 flex items-center gap-2 overflow-x-auto" style={{ borderBottom: '1px solid var(--tf-border)' }}>
          <span className="text-xs font-mono shrink-0 mr-2" style={{ color: 'var(--tf-subtle)' }}>Pair</span>
          {PAIRS.map(p => (
            <button key={p.label} onClick={() => setSelected(p)}
              className="rounded-full px-3 py-1.5 text-xs font-mono shrink-0 transition-all"
              style={{
                border: selected.label === p.label ? '1px solid #C9A84C' : '1px solid var(--tf-border)',
                background: selected.label === p.label ? 'rgba(201,168,76,.15)' : 'transparent',
                color: selected.label === p.label ? '#C9A84C' : 'var(--tf-muted)',
              }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Full screen TradingView Advanced Chart */}
        <div className="flex-1 overflow-hidden">
          <iframe
            key={selected.tv}
            src={`https://s.tradingview.com/widgetembed/?frameElementId=tv_chart&symbol=${selected.tv}&interval=H1&theme=dark&style=1&locale=en&enable_publishing=false&hide_top_toolbar=false&hide_legend=false&save_image=false&calendar=false&hide_volume=false&studies=[]&withdateranges=1&showpopupbutton=1`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allowTransparency
            allowFullScreen
          />
        </div>
      </main>
    </div>
  )
}
