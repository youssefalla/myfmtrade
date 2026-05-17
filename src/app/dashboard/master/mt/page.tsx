'use client'

import { useEffect, useState, useCallback } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import type { Profile } from '@/types/database'
import { RefreshCw, Wifi, WifiOff, TrendingUp, TrendingDown } from 'lucide-react'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

interface AccountInfo {
  balance: number
  equity: number
  profit: number
  margin: number
  marginLevel: number
  leverage: number
  currency: string
  broker: string
  server: string
}

interface Position {
  id: string
  symbol: string
  type: string
  volume: number
  openPrice: number
  currentPrice: number
  profit: number
  swap: number
  openingComment?: string
}

interface Deal {
  id: string
  symbol?: string
  type: string
  entryType?: string
  profit: number
  time: string
  volume?: number
}

interface Stats {
  info: AccountInfo | null
  positions: Position[]
  deals: Deal[]
  account: { platform: string; server: string; login: string }
}

function EquityCurve({ deals }: { deals: Deal[] }) {
  const closedDeals = deals
    .filter(d => d.entryType === 'DEAL_ENTRY_OUT' && d.symbol)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

  if (closedDeals.length < 2) {
    return <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--tf-subtle)' }}>Not enough data for curve</div>
  }

  let running = 0
  const points = closedDeals.map(d => { running += d.profit; return running })
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const W = 600
  const H = 120
  const pad = 8

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (W - pad * 2)
    const y = H - pad - ((p - min) / range) * (H - pad * 2)
    return `${x},${y}`
  })

  const isPositive = points[points.length - 1] >= 0
  const color = isPositive ? '#4ADE80' : '#F87171'
  const fillColor = isPositive ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)'
  const lastY = H - pad - ((points[points.length - 1] - min) / range) * (H - pad * 2)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
      <defs>
        <linearGradient id="eq-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path
        d={`M ${coords[0]} L ${coords.slice(1).join(' L ')} L ${600 - pad},${H} L ${pad},${H} Z`}
        fill="url(#eq-fill)"
      />
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={600 - pad} cy={lastY} r="3" fill={color}/>
    </svg>
  )
}

export default function MTDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsError, setStatsError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [hasAccount, setHasAccount] = useState(false)

  // Connect form
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')
  const [form, setForm] = useState({ login: '', password: '', server: '', platform: 'MT5' })

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const [pRes, mtRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('mt_accounts').select('id').eq('master_id', user.id).single(),
      ])

      setProfile(pRes.data)
      if (mtRes.data) {
        setHasAccount(true)
        fetchStats()
      } else {
        setLoading(false)
      }
    }
    load()
  }, [])

  const fetchStats = useCallback(async () => {
    setRefreshing(true)
    setStatsError('')
    try {
      const res = await fetch('/api/mt/stats')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStats(data)
    } catch (e) {
      setStatsError(e instanceof Error ? e.message : 'Failed to fetch stats')
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [])

  async function connectAccount() {
    if (!form.login || !form.password || !form.server) {
      setConnectError('All fields are required.')
      return
    }
    setConnecting(true)
    setConnectError('')
    try {
      const res = await fetch('/api/mt/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setHasAccount(true)
      setLoading(true)
      // Give MetaAPI a moment to deploy
      setTimeout(() => fetchStats(), 5000)
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setConnecting(false)
    }
  }

  const closedDeals = stats?.deals.filter(d => d.entryType === 'DEAL_ENTRY_OUT' && d.symbol) ?? []
  const winners = closedDeals.filter(d => d.profit > 0).length
  const losers = closedDeals.filter(d => d.profit < 0).length
  const winRate = closedDeals.length ? Math.round((winners / closedDeals.length) * 100) : 0
  const totalProfit = closedDeals.reduce((s, d) => s + d.profit, 0)
  const avgProfit = closedDeals.length ? totalProfit / closedDeals.length : 0

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center tf-page">
      <div className="text-center">
        <div className="text-sm font-mono mb-2" style={{ color: 'var(--tf-subtle)' }}>
          {hasAccount ? 'Connecting to MetaTrader…' : 'Loading…'}
        </div>
        {hasAccount && <div className="text-xs" style={{ color: 'var(--tf-subtle)' }}>This may take up to 30 seconds on first load.</div>}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex tf-page" style={{ fontFamily: SYS }}>
      <MasterSidebar profile={profile} onAvatarChange={url => setProfile(p => p ? { ...p, avatar_url: url } : p)} />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }}>MT Dashboard</h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--tf-subtle)' }}>Live connection to your MetaTrader account</p>
            </div>
            {hasAccount && (
              <button onClick={fetchStats} disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
                style={{ border: '1px solid var(--tf-border)', color: 'var(--tf-muted)', background: 'transparent' }}>
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            )}
          </div>

          {/* NOT CONNECTED — show connect form */}
          {!hasAccount && (
            <div className="max-w-md mx-auto">
              <div className="rounded-2xl p-8 tf-card-bg" style={{ border: '1px solid rgba(201,168,76,.25)' }}>
                <div className="w-12 h-12 rounded-full grid place-items-center mx-auto mb-5"
                  style={{ background: 'rgba(201,168,76,.12)', border: '1px solid rgba(201,168,76,.3)' }}>
                  <WifiOff size={20} color="#C9A84C" />
                </div>
                <h2 className="text-center text-base font-semibold mb-1" style={{ color: 'var(--tf-text)' }}>Connect MetaTrader</h2>
                <p className="text-center text-xs mb-7" style={{ color: 'var(--tf-subtle)' }}>
                  Link your MT4 or MT5 account to see live stats, balance, and trade history.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Platform</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['MT4', 'MT5'].map(p => (
                        <button key={p} onClick={() => setForm(f => ({ ...f, platform: p }))}
                          className="rounded-xl py-2.5 text-sm font-medium transition-all"
                          style={{
                            border: form.platform === p ? '1px solid #C9A84C' : '1px solid var(--tf-border)',
                            background: form.platform === p ? 'rgba(201,168,76,.1)' : 'transparent',
                            color: form.platform === p ? '#C9A84C' : 'var(--tf-muted)',
                          }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Account Login</label>
                    <input
                      value={form.login}
                      onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
                      placeholder="123456"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Password (Investor or Master)</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Server Name</label>
                    <input
                      value={form.server}
                      onChange={e => setForm(f => ({ ...f, server: e.target.value }))}
                      placeholder="e.g. ICMarkets-Demo, XMGlobal-MT5"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input"
                    />
                  </div>

                  {connectError && <p className="text-xs font-mono" style={{ color: '#F87171' }}>{connectError}</p>}

                  <button onClick={connectAccount} disabled={connecting}
                    className="btn-gold rounded-xl py-3.5 text-sm font-semibold w-full mt-2">
                    {connecting ? 'Connecting…' : 'Connect Account →'}
                  </button>

                  <p className="text-center text-[11px] mt-3" style={{ color: 'var(--tf-subtle)' }}>
                    Powered by MetaAPI · Your credentials are encrypted
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CONNECTED — show dashboard */}
          {hasAccount && stats && (
            <div className="space-y-6">

              {/* Connection status */}
              <div className="flex items-center gap-2 text-xs" style={{ color: '#4ADE80' }}>
                <Wifi size={13} />
                <span className="font-mono">{stats.account.platform.toUpperCase()} · {stats.account.server} · #{stats.account.login}</span>
              </div>

              {/* Account KPIs */}
              {stats.info && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Balance', value: `${stats.info.currency} ${stats.info.balance?.toLocaleString('en', { minimumFractionDigits: 2 })}`, color: 'var(--tf-text)' },
                    { label: 'Equity', value: `${stats.info.currency} ${stats.info.equity?.toLocaleString('en', { minimumFractionDigits: 2 })}`, color: stats.info.equity >= stats.info.balance ? '#4ADE80' : '#F87171' },
                    { label: 'Open P&L', value: `${stats.info.profit >= 0 ? '+' : ''}${stats.info.profit?.toFixed(2)}`, color: stats.info.profit >= 0 ? '#4ADE80' : '#F87171' },
                    { label: 'Margin Level', value: stats.info.marginLevel ? `${stats.info.marginLevel?.toFixed(1)}%` : '—', color: '#C9A84C' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-2xl p-5 tf-card-bg">
                      <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-subtle)' }}>{label}</div>
                      <div style={{ fontFamily: SYS, fontSize: '1.25rem', fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* 30D Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: '30D Win Rate', value: closedDeals.length ? `${winRate}%` : '—', color: winRate >= 55 ? '#4ADE80' : winRate >= 45 ? '#C9A84C' : '#F87171' },
                  { label: 'Closed Trades', value: closedDeals.length.toString(), color: 'var(--tf-text)' },
                  { label: '30D Net P&L', value: closedDeals.length ? `${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}` : '—', color: totalProfit >= 0 ? '#4ADE80' : '#F87171' },
                  { label: 'Avg Trade', value: closedDeals.length ? `${avgProfit >= 0 ? '+' : ''}${avgProfit.toFixed(2)}` : '—', color: avgProfit >= 0 ? '#4ADE80' : '#F87171' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-2xl p-5 tf-card-bg">
                    <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-subtle)' }}>{label}</div>
                    <div style={{ fontFamily: SYS, fontSize: '1.25rem', fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Equity Curve */}
              <div className="rounded-2xl p-6 tf-card-bg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>Equity Curve — 30 Days</h2>
                  <span className="text-xs font-mono" style={{ color: 'var(--tf-subtle)' }}>{closedDeals.length} trades</span>
                </div>
                <div style={{ height: 120 }}>
                  <EquityCurve deals={stats.deals} />
                </div>
              </div>

              {/* Open Positions */}
              {stats.positions.length > 0 && (
                <div className="rounded-2xl p-6 tf-card-bg">
                  <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--tf-text)' }}>Open Positions</h2>
                  <div className="space-y-2">
                    {stats.positions.map(pos => (
                      <div key={pos.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
                        style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)' }}>
                        <div className="w-7 h-7 rounded-lg grid place-items-center"
                          style={{ background: pos.type === 'POSITION_TYPE_BUY' ? 'rgba(74,222,128,.12)' : 'rgba(248,113,113,.12)' }}>
                          {pos.type === 'POSITION_TYPE_BUY'
                            ? <TrendingUp size={13} color="#4ADE80" />
                            : <TrendingDown size={13} color="#F87171" />}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-mono font-semibold" style={{ color: 'var(--tf-text)' }}>{pos.symbol}</span>
                          <span className="text-xs ml-2" style={{ color: 'var(--tf-subtle)' }}>{pos.volume} lots</span>
                        </div>
                        <div className="text-xs font-mono" style={{ color: 'var(--tf-subtle)' }}>@ {pos.openPrice}</div>
                        <div className="text-sm font-semibold font-mono" style={{ color: pos.profit >= 0 ? '#4ADE80' : '#F87171' }}>
                          {pos.profit >= 0 ? '+' : ''}{pos.profit?.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Deals */}
              {closedDeals.length > 0 && (
                <div className="rounded-2xl p-6 tf-card-bg">
                  <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--tf-text)' }}>Last 30 Days — Closed Trades</h2>
                  <div className="space-y-1">
                    {closedDeals.slice(-20).reverse().map((d, i) => (
                      <div key={d.id ?? i} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid var(--tf-border)' }}>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.profit > 0 ? '#4ADE80' : '#F87171' }} />
                        <div className="flex-1 text-sm font-mono" style={{ color: 'var(--tf-text)' }}>{d.symbol}</div>
                        <div className="text-xs" style={{ color: 'var(--tf-subtle)' }}>
                          {new Date(d.time).toLocaleDateString()}
                        </div>
                        <div className="text-sm font-semibold font-mono" style={{ color: d.profit > 0 ? '#4ADE80' : '#F87171' }}>
                          {d.profit > 0 ? '+' : ''}{d.profit?.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error state */}
          {hasAccount && statsError && (
            <div className="rounded-2xl p-8 tf-card-bg text-center">
              <WifiOff size={32} className="mx-auto mb-3" style={{ color: '#F87171' }} />
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--tf-text)' }}>Could not fetch account data</p>
              <p className="text-xs mb-5" style={{ color: 'var(--tf-subtle)' }}>{statsError}</p>
              <button onClick={fetchStats} className="btn-gold rounded-xl px-6 py-2.5 text-sm font-semibold">
                Try Again
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
