'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

const followers = [
  { init:'MA', name:'Mohammed A.', city:'Casablanca', since:'3 months', profit:'+2,840 MAD' },
  { init:'LT', name:'Leila T.',     city:'Tangier',    since:'1 month',  profit:'+940 MAD' },
  { init:'OB', name:'Omar B.',      city:'Fès',        since:'2 weeks',  profit:'+380 MAD' },
  { init:'SA', name:'Samira A.',    city:'Rabat',      since:'5 days',   profit:'+140 MAD' },
]

const trades = [
  { pair:'XAUUSD', dir:'BUY',  result:'WIN',  pnl:'+38 pips', time:'09:24', copied:47 },
  { pair:'EURUSD', dir:'SELL', result:'LOSS', pnl:'-12 pips', time:'11:05', copied:47 },
  { pair:'US30',   dir:'BUY',  result:'WIN',  pnl:'+95 pips', time:'14:37', copied:47 },
]

export default function MasterDashboard() {
  return (
    <div className="min-h-screen flex tf-page">
      {/* Sidebar */}
      <aside className="w-64 hidden md:flex flex-col p-6 gap-6 shrink-0 tf-sidebar">
        <Link href="/" className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14.5" stroke="#C9A84C" strokeWidth="1"/><path d="M22 9 A 11 11 0 1 0 22 23 A 8 8 0 1 1 22 9 Z" fill="#C9A84C"/><path d="M11 21 L21 11 M16 11 H21 V16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, color: 'var(--tf-text)' }}>Trade<span style={{ color: '#C9A84C' }}>Flow</span></span>
        </Link>

        <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.2)' }}>
          <div className="w-14 h-14 rounded-full grid place-items-center mx-auto mb-3 font-bold text-xl" style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)', color: '#1F2329', fontFamily: 'var(--font-syne)' }}>YA</div>
          <div className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>Youssef Amrani</div>
          <div className="text-xs font-mono mt-0.5" style={{ color: '#C9A84C' }}>Master Trader ✓</div>
          <div className="text-xs mt-2 font-mono" style={{ color: 'var(--tf-subtle)' }}>Casablanca · 4y track</div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {[
            { icon:'📊', label:'Dashboard',   href:'/dashboard/master', active:true },
            { icon:'👁️', label:'Gig Profile',  href:'/dashboard/master' },
            { icon:'👥', label:'Followers',    href:'/dashboard/master' },
            { icon:'📈', label:'My Trades',    href:'/dashboard/master' },
            { icon:'💰', label:'Earnings',     href:'/dashboard/master' },
            { icon:'🎙️', label:'Community',    href:'/marketplace' },
            { icon:'⚙️', label:'Settings',     href:'/dashboard/master' },
          ].map(({ icon, label, href, active }) => (
            <Link key={label} href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{ background: active ? 'rgba(201,168,76,.12)' : 'transparent', color: active ? '#C9A84C' : 'var(--tf-muted)', border: active ? '1px solid rgba(201,168,76,.2)' : '1px solid transparent' }}>
              <span>{icon}</span><span>{label}</span>
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
              <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)' }}>Master Dashboard</h1>
              <div className="flex items-center gap-1.5 mt-1 text-xs font-mono" style={{ color: 'var(--tf-subtle)' }}>
                <span className="live-dot"></span> Live · 47 followers copying you now
              </div>
            </div>
            <Link href="/marketplace" className="btn-gold rounded-full px-5 py-2.5 text-sm font-semibold">My Gig Page</Link>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label:'Total Followers', value:'47',           color:'var(--tf-text)', sub:'↑ 8 this week' },
              { label:'30D ROI',         value:'+34.2%',       color:'#4ADE80', sub:'All time high' },
              { label:'Perf. Fees',      value:'3,240 MAD',    color:'#C9A84C', sub:'This month' },
              { label:'Win Rate',        value:'82%',          color:'#E8C97A', sub:'Last 60 trades' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="rounded-2xl p-5 tf-card-bg">
                <div className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-subtle)' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
                <div className="text-xs mt-1 font-mono" style={{ color: 'var(--tf-subtle)' }}>{sub}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Recent Trades */}
            <div className="rounded-2xl p-6 tf-card-bg">
              <h2 className="mb-5" style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, color: 'var(--tf-text)' }}>Recent Trades</h2>
              <div className="space-y-3">
                {trades.map(({ pair, dir, result, pnl, time, copied }) => (
                  <div key={`${pair}-${time}`} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid var(--tf-border)' }}>
                    <div className="w-8 h-8 rounded-lg grid place-items-center text-xs font-mono font-bold"
                      style={{ background: result === 'WIN' ? 'rgba(34,197,94,.12)' : 'rgba(248,113,113,.12)', color: result === 'WIN' ? '#4ADE80' : '#F87171' }}>
                      {dir === 'BUY' ? '↑' : '↓'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-mono font-medium" style={{ color: 'var(--tf-text)' }}>{pair} <span className="text-[10px] font-mono" style={{ color: 'var(--tf-subtle)' }}>· {copied} copied</span></div>
                      <div className="text-xs font-mono" style={{ color: 'var(--tf-subtle)' }}>{time}</div>
                    </div>
                    <div className="text-sm font-mono font-semibold" style={{ color: result === 'WIN' ? '#4ADE80' : '#F87171' }}>{pnl}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Followers */}
            <div className="rounded-2xl p-6 tf-card-bg">
              <div className="flex items-center justify-between mb-5">
                <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, color: 'var(--tf-text)' }}>Top Followers</h2>
                <span className="text-xs font-mono" style={{ color: 'var(--tf-subtle)' }}>47 total</span>
              </div>
              <div className="space-y-3">
                {followers.map(({ init, name, city, since, profit }) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full grid place-items-center font-bold text-xs shrink-0" style={{ background: 'rgba(201,168,76,.2)', color: '#C9A84C', fontFamily: 'var(--font-syne)' }}>{init}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: 'var(--tf-text)' }}>{name}</div>
                      <div className="text-xs font-mono" style={{ color: 'var(--tf-subtle)' }}>{city} · {since}</div>
                    </div>
                    <div className="text-sm font-mono font-semibold shrink-0" style={{ color: '#4ADE80' }}>{profit}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Marketplace offers */}
          <div className="rounded-2xl p-6 tf-card-bg">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, color: 'var(--tf-text)' }}>Your Marketplace Offers</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--tf-muted)' }}>Courses and premium signals you sell to followers</p>
              </div>
              <button className="btn-gold rounded-full px-4 py-2 text-xs font-semibold">+ New Offer</button>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { title:'SMC Masterclass', price:'499 MAD', sales:23, type:'Course' },
                { title:'Gold Signals VIP', price:'199 MAD/mo', sales:31, type:'Signal' },
                { title:'1-on-1 Mentoring', price:'1,200 MAD', sales:5, type:'Service' },
              ].map(({ title, price, sales, type }) => (
                <div key={title} className="rounded-xl p-4" style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)' }}>
                  <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: '#C9A84C' }}>{type}</div>
                  <div className="text-sm font-semibold mb-1" style={{ color: 'var(--tf-text)' }}>{title}</div>
                  <div style={{ fontFamily: 'var(--font-syne)', color: '#C9A84C', fontWeight: 600 }}>{price}</div>
                  <div className="text-xs font-mono mt-2" style={{ color: 'var(--tf-subtle)' }}>{sales} sales</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
