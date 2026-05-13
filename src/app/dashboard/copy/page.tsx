'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LayoutDashboard, Users, TrendingUp, Banknote, BookOpen, Settings } from 'lucide-react'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

const traders = [
  { init:'YA', name:'Youssef Amrani', roi:'+34.2%', win:82, followers:'14.2k', status:'active' },
  { init:'SC', name:'Salma Chraibi',  roi:'+21.7%', win:76, followers:'9.6k',  status:'active' },
]

const recentTrades = [
  { pair:'XAUUSD', dir:'BUY',  pips:'+38', time:'09:24', profit:'+240 MAD' },
  { pair:'EURUSD', dir:'SELL', pips:'-12', time:'11:05', profit:'-74 MAD' },
  { pair:'US30',   dir:'BUY',  pips:'+95', time:'14:37', profit:'+601 MAD' },
  { pair:'XAUUSD', dir:'SELL', pips:'+22', time:'16:12', profit:'+138 MAD' },
]

const navItems = [
  { icon: LayoutDashboard, label:'Dashboard',  href:'/dashboard/copy', active:true },
  { icon: Users,           label:'My Traders', href:'/marketplace' },
  { icon: TrendingUp,      label:'My Trades',  href:'/dashboard/copy' },
  { icon: Banknote,        label:'Rebates',    href:'/dashboard/copy' },
  { icon: BookOpen,        label:'Courses',    href:'/dashboard/copy' },
  { icon: Settings,        label:'Settings',   href:'/dashboard/copy' },
]

export default function CopyDashboard() {
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
              <Icon size={16} strokeWidth={1.7} />
              <span>{label}</span>
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
                <span className="live-dot"></span> Copy Trading Active
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/marketplace" className="btn-outline rounded-full px-4 py-2 text-sm">Browse Traders</Link>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label:'Total P/L',     value:'+1,284 MAD', color:'#4ADE80',        sub:'This month' },
              { label:'Copied Trades', value:'47',         color:'var(--tf-text)', sub:'This month' },
              { label:'Win Rate',      value:'71%',        color:'#C9A84C',        sub:'All traders' },
              { label:'Rebates',       value:'38 MAD',     color:'#E8C97A',        sub:'This week' },
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
              <div className="space-y-4">
                {traders.map(({ init, name, roi, win, status }) => (
                  <div key={name} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)' }}>
                    <div className="w-10 h-10 rounded-full grid place-items-center font-bold shrink-0" style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)', color: '#1F2329', fontFamily: SYS }}>{init}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--tf-text)' }}>{name}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--tf-subtle)' }}>Win: {win}%</div>
                    </div>
                    <div className="text-right">
                      <div style={{ color: '#4ADE80', fontFamily: SYS, fontWeight: 600 }}>{roi}</div>
                      <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: '#4ADE80' }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }}></span> {status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Trades */}
            <div className="rounded-2xl p-6 tf-card-bg">
              <h2 className="mb-5 text-base font-semibold" style={{ fontFamily: SYS, color: 'var(--tf-text)', letterSpacing: '-0.02em' }}>Recent Copied Trades</h2>
              <div className="space-y-3">
                {recentTrades.map(({ pair, dir, pips, time, profit }, i) => (
                  <div key={i} className="flex items-center gap-3 py-2" style={{ borderBottom: i < recentTrades.length - 1 ? '1px solid var(--tf-border)' : 'none' }}>
                    <div className="w-8 h-8 rounded-lg grid place-items-center text-xs font-bold"
                      style={{ background: dir === 'BUY' ? 'rgba(34,197,94,.12)' : 'rgba(248,113,113,.12)', color: dir === 'BUY' ? '#4ADE80' : '#F87171' }}>
                      {dir === 'BUY' ? '↑' : '↓'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: 'var(--tf-text)', fontFamily: SYS }}>{pair}</div>
                      <div className="text-xs" style={{ color: 'var(--tf-subtle)' }}>{time} · {pips} pips</div>
                    </div>
                    <div className="text-sm font-semibold" style={{ color: profit.startsWith('+') ? '#4ADE80' : '#F87171', fontFamily: SYS }}>{profit}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Marketplace CTA */}
          <div className="mt-6 rounded-2xl p-6 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,.15), rgba(201,168,76,.05))', border: '1px solid rgba(201,168,76,.25)' }}>
            <div>
              <div className="font-semibold" style={{ fontFamily: SYS, color: 'var(--tf-text)', letterSpacing: '-0.02em' }}>Discover more traders</div>
              <div className="text-sm mt-1" style={{ color: 'var(--tf-muted)' }}>150+ verified traders available on the marketplace</div>
            </div>
            <Link href="/marketplace" className="btn-gold rounded-full px-6 py-2.5 text-sm font-semibold shrink-0">Browse All →</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
