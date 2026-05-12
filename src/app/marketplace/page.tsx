'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

const traders = [
  { init:'YA', name:'Youssef Amrani',   city:'Casablanca', style:'SMC · Gold',    roi:'+34.2%', win:82,  followers:'14.2k', fee:'10%', badge:'Top Performer' },
  { init:'SC', name:'Salma Chraibi',    city:'Rabat',      style:'Smart Money',   roi:'+21.7%', win:76,  followers:'9.6k',  fee:'8%',  badge:'' },
  { init:'MB', name:'Mehdi Benjelloun', city:'Marrakech',  style:'Indices',       roi:'+18.4%', win:71,  followers:'6.1k',  fee:'10%', badge:'' },
  { init:'BB', name:'Brahim Benjelloun',city:'Agadir',     style:'Forex · Scalp', roi:'+22.7%', win:79,  followers:'3.2k',  fee:'12%', badge:'Rising Star' },
  { init:'FK', name:'Fatima Khalid',    city:'Marrakech',  style:'Swing Trading', roi:'+18.4%', win:68,  followers:'2.8k',  fee:'8%',  badge:'' },
  { init:'OC', name:'Omar Cherkaoui',   city:'Fès',        style:'Crypto · BTC',  roi:'+29.1%', win:74,  followers:'5.5k',  fee:'15%', badge:'New' },
]

const filters = ['All', 'Forex', 'Gold', 'Indices', 'Crypto', 'Scalping', 'Swing']

export default function Marketplace() {
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('roi')

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
            <Link href="/signup" className="btn-gold rounded-full px-4 py-2 text-sm font-semibold">Start Copying</Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="text-xs tracking-[0.22em] uppercase font-mono mb-3" style={{ color: '#C9A84C' }}>↗ Traders Offers & Gigs</div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 700, color: 'var(--tf-text)', lineHeight: 1.1 }}>150+ Verified Master<br/>Traders to Copy</h1>
          <p className="mt-4 text-sm max-w-xl" style={{ color: 'var(--tf-muted)' }}>All traders are KYC verified with audited track records. Filter by style, ROI, and instruments.</p>
        </div>

        {/* Filters + Sort */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {filters.map(f => (
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
            <option value="followers">Sort: Most Followed</option>
          </select>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {traders.map(({ init, name, city, style, roi, win, followers, fee, badge }) => (
            <div key={name} className="ai-card p-6 flex flex-col relative" style={{ minHeight: 360 }}>
              {badge && (
                <div className="absolute top-4 right-4 text-[10px] font-mono uppercase tracking-widest border rounded-full px-2.5 py-1"
                  style={{ color: '#C9A84C', borderColor: 'rgba(201,168,76,.4)', background: 'rgba(201,168,76,.1)' }}>
                  {badge === 'Top Performer' ? '★ ' : badge === 'Rising Star' ? '↑ ' : '✦ '}{badge}
                </div>
              )}
              <div className="ai-content h-full flex flex-col">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full grid place-items-center font-bold text-xl shrink-0"
                    style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)', color: '#1F2329', fontFamily: 'var(--font-syne)', boxShadow: '0 8px 20px rgba(201,168,76,.2)' }}>{init}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-base truncate" style={{ color: '#F0EDE8', fontFamily: 'var(--font-syne)' }}>{name}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#C9A84C"><path d="M12 2l2.4 4.8L20 8l-4 3.9.9 5.5L12 14.8 7.1 17.4 8 11.9 4 8l5.6-1.2z"/></svg>
                    </div>
                    <div className="text-xs font-mono mt-0.5" style={{ color: 'rgba(240,237,232,.45)' }}>{city} · {style}</div>
                  </div>
                </div>

                <div className="mt-6 flex items-end gap-3">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(240,237,232,.45)' }}>30D ROI</div>
                    <div style={{ fontFamily: 'var(--font-syne)', fontSize: '2.5rem', color: '#4ADE80', fontWeight: 700, lineHeight: 1 }}>{roi}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    { l:'Win Rate', v:`${win}%` },
                    { l:'Followers', v:followers },
                    { l:'Perf. Fee', v:fee },
                  ].map(({ l, v }) => (
                    <div key={l} className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                      <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'rgba(240,237,232,.4)' }}>{l}</div>
                      <div className="text-sm font-semibold mt-0.5" style={{ color: '#F0EDE8', fontFamily: 'var(--font-syne)' }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-5">
                  <Link href="/signup?role=trader" className="btn-gold rounded-full w-full py-3 text-sm font-semibold text-center block">Copy Trader</Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load more */}
        <div className="text-center mt-12">
          <button className="btn-outline rounded-full px-8 py-3 text-sm font-medium">Load 20 more traders</button>
        </div>

        {/* Become a master trader CTA */}
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
