'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

const PERKS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    title: 'Performance Fees',
    desc: "Earn 5–30% of your followers' monthly profits. You set the rate. Paid automatically every month.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: 'Your Own Community',
    desc: 'Every master gets a private space — post setups, voice rooms, live analysis. Build your brand.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
    title: 'Live Dashboard',
    desc: 'See your follower count, copied volume, win rate, and monthly earnings — all in real time.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="13" y2="13"/>
      </svg>
    ),
    title: 'Sell Your Courses',
    desc: 'Publish paid masterclasses directly to your followers. Keep 80% of every sale.',
  },
]

function AuthPanel() {
  const [tab, setTab] = useState<'signup' | 'login'>('signup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    const fd = new FormData(e.currentTarget)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    if (tab === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: fd.get('email') as string,
        password: fd.get('password') as string,
        options: { data: { role: 'master', full_name: fd.get('name') } },
      })
      if (error) { setError(error.message); setLoading(false); return }
      window.location.href = '/onboarding/master'
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: fd.get('email') as string,
        password: fd.get('password') as string,
      })
      if (error) { setError(error.message); setLoading(false); return }
      window.location.href = '/dashboard/master'
    }
  }

  return (
    <div className="rounded-2xl p-8 tf-card-gold" style={{ maxWidth: 480, width: '100%' }}>
      {/* Tab switcher */}
      <div className="flex rounded-xl p-1 mb-7" style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)' }}>
        {(['signup', 'login'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setError(''); setSuccess('') }}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all"
            style={{
              background: tab === t ? '#C9A84C' : 'transparent',
              color: tab === t ? '#0A0C0F' : 'var(--tf-muted)',
            }}>
            {t === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {tab === 'signup' && (
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Full Name</label>
            <input name="name" type="text" required placeholder="Youssef Amrani"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input"/>
          </div>
        )}
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Email</label>
          <input name="email" type="email" required placeholder="you@example.com"
            className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input"/>
        </div>
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Password</label>
          <input name="password" type="password" required placeholder="Min 8 characters" minLength={8}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input"/>
        </div>
        {error && <p className="text-xs font-mono" style={{ color: '#F87171' }}>{error}</p>}
        {success && <p className="text-xs font-mono" style={{ color: '#4ADE80' }}>{success}</p>}
        <button type="submit" disabled={loading} className="btn-gold w-full rounded-xl py-3.5 text-sm font-semibold mt-1">
          {loading ? (tab === 'signup' ? 'Creating account…' : 'Signing in…') : (tab === 'signup' ? 'Create Master Account →' : 'Sign In →')}
        </button>
      </form>

      {tab === 'signup' && (
        <p className="mt-5 text-xs text-center" style={{ color: 'var(--tf-subtle)' }}>
          By creating an account you agree to our{' '}
          <span style={{ color: '#C9A84C', cursor: 'pointer' }}>Terms of Service</span>.
        </p>
      )}
    </div>
  )
}

export default function MastersPage() {
  useEffect(() => {
    const targets = document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.stagger')
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
    }, { threshold: 0, rootMargin: '40px' })
    targets.forEach(el => io.observe(el))
    requestAnimationFrame(() => {
      targets.forEach(el => {
        const rect = (el as HTMLElement).getBoundingClientRect()
        if (rect.top < window.innerHeight + 40) { el.classList.add('in'); io.unobserve(el) }
      })
    })
    return () => io.disconnect()
  }, [])

  return (
    <div style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>

      {/* ===== NAV ===== */}
      <header className="fixed top-4 inset-x-0 z-50 px-4">
        <nav className="glass max-w-5xl mx-auto rounded-full pl-5 pr-2 py-2 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14.5" stroke="#C9A84C" strokeWidth="1"/>
              <path d="M22 9 A 11 11 0 1 0 22 23 A 8 8 0 1 1 22 9 Z" fill="#C9A84C"/>
              <path d="M11 21 L21 11 M16 11 H21 V16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-syne)', fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--tf-text)' }}>
              Trade<span style={{ color: '#C9A84C' }}>Flow</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle size={10} />
            <Link href="/" className="btn-outline rounded-full px-4 py-2.5 text-sm font-medium tracking-tight">
              ← Copy Trading
            </Link>
          </div>
        </nav>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative min-h-[92vh] flex flex-col justify-center items-center text-center pt-32 pb-16 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(201,168,76,.1) 0%, transparent 70%)',
        }}/>
        <div className="hero-bg" style={{ opacity: 0.5 }}>
          <div className="mesh"></div>
        </div>

        <div className="relative max-w-3xl mx-auto hero-left">
          <div className="inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase font-mono border border-white/15 rounded-full px-3 py-1.5 mb-6" style={{ color: 'var(--tf-muted)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#C9A84C' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>For Master Traders</span>
          </div>

          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(2.4rem,6vw,4.5rem)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', color: 'var(--tf-text)' }}>
            Turn your edge into<br/>
            <em className="gold-shimmer not-italic">a monthly income.</em>
          </h1>

          <p className="mt-6 text-lg leading-relaxed max-w-xl mx-auto" style={{ color: 'var(--tf-muted)' }}>
            Share your MT5 signals on TradeFlow. Followers copy you automatically — and you earn a performance fee on every profit they make.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>
            {['KYC Verified','5–30% performance fee','Your own community','Sell your courses'].map((f, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span style={{ color: '#C9A84C' }}>✓</span> {f}
              </span>
            ))}
          </div>

          <a href="#join" className="btn-gold rounded-full px-8 py-3.5 text-sm font-semibold mt-10 inline-block">
            Apply as a Master →
          </a>
        </div>

        {/* Floating earnings card */}
        <div className="hero-right mt-14 flex justify-center gap-4 flex-wrap">
          <div className="rounded-2xl p-5 text-left" style={{
            background: 'linear-gradient(145deg,#1C1E26,#0A0C0F)',
            border: '1px solid rgba(201,168,76,.3)',
            minWidth: 200,
            boxShadow: '0 24px 60px -20px rgba(0,0,0,.6)',
          }}>
            <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(240,237,232,.4)' }}>This month's earnings</div>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: '2.25rem', fontWeight: 700, color: '#C9A84C', marginTop: '0.5rem' }}>14,200 MAD</div>
            <div className="mt-3 flex items-center gap-1.5 text-xs font-mono" style={{ color: '#4ADE80' }}>
              <span>▲</span> 100 followers × 500 MAD profit × 10% fee
            </div>
          </div>
          <div className="rounded-2xl p-5 text-left self-end" style={{
            background: 'linear-gradient(145deg,#1a1c24,#0d0f14)',
            border: '1px solid rgba(201,168,76,.2)',
            minWidth: 180,
            boxShadow: '0 24px 60px -20px rgba(0,0,0,.5)',
          }}>
            <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgba(240,237,232,.4)' }}>Followers</div>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: '2rem', fontWeight: 700, color: '#F0EDE8' }}>2,847</div>
            <div className="mt-1 text-[11px] font-mono" style={{ color: 'rgba(240,237,232,.4)' }}>+134 this week</div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce" style={{ color: 'var(--tf-subtle)' }}>
          <span className="text-[10px] font-mono uppercase tracking-widest">Scroll</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </div>
      </section>

      {/* ===== PERKS ===== */}
      <section className="relative py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 reveal">
            <div className="text-xs tracking-[0.22em] uppercase font-mono" style={{ color: '#C9A84C' }}>↗ What you get</div>
            <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 700, marginTop: '0.75rem', color: 'var(--tf-text)' }}>
              Everything you need<br/>to monetize your edge.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 stagger">
            {PERKS.map(({ icon, title, desc }) => (
              <div key={title} className="bento rounded-2xl p-7 reveal">
                <div className="bento-icon w-12 h-12 rounded-xl grid place-items-center mb-5" style={{ border: '1px solid rgba(201,168,76,.4)', background: 'rgba(201,168,76,.1)', color: '#C9A84C' }}>
                  {icon}
                </div>
                <h3 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--tf-text)' }}>{title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--tf-muted)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS (master side) ===== */}
      <section className="relative py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14 reveal">
            <div className="text-xs tracking-[0.22em] uppercase font-mono" style={{ color: '#C9A84C' }}>↗ How it works</div>
            <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 700, marginTop: '0.75rem', color: 'var(--tf-text)' }}>
              Live in under 10 minutes.
            </h2>
          </div>

          <ol className="relative stagger">
            <span className="absolute left-[27px] top-2 bottom-2 w-px" style={{ background: 'linear-gradient(180deg, transparent, rgba(201,168,76,.4), transparent)' }}/>
            {[
              { n: '01', title: 'Create your master account.', desc: 'Sign up, verify your identity (KYC), and connect your MT5 account. We only need investor-level read access — we never touch your money.', time: '~ 3 min' },
              { n: '02', title: 'Set your fee and profile.', desc: 'Choose a performance fee (5–30%), write your bio, select your instruments and trading style. Your gig page goes live instantly.', time: '~ 4 min' },
              { n: '03', title: 'Trade as you normally would.', desc: 'The moment you open a position, all your followers mirror it automatically. You don\'t change a thing about how you trade.', time: '~ 0 min' },
              { n: '04', title: 'Get paid every month.', desc: 'At month-end, your performance fees are calculated and paid directly to your wallet. Withdraw anytime in MAD or crypto.', time: 'Auto' },
            ].map(({ n, title, desc, time }) => (
              <li key={n} className="relative pl-20 pb-12 last:pb-0 reveal">
                <div className="step-dot absolute left-0 top-0 w-14 h-14 rounded-full grid place-items-center" style={{ fontFamily: 'var(--font-syne)', fontSize: '1.25rem', color: '#C9A84C' }}>{n}</div>
                <h3 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--tf-text)' }}>{title}</h3>
                <p className="mt-2 max-w-lg leading-relaxed text-sm" style={{ color: 'var(--tf-muted)' }}>{desc}</p>
                <div className="mt-3 inline-flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--tf-muted)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }}/>
                  {time}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===== AUTH ===== */}
      <section id="join" className="relative py-20 px-6">
        {/* Canvas background same as pricing — subtle animated waves */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(201,168,76,.12) 0%, transparent 70%)',
          }}/>
        </div>

        <div className="relative max-w-5xl mx-auto flex flex-col lg:flex-row items-start gap-16">
          {/* Left — pitch text */}
          <div className="flex-1 reveal-left lg:pt-6">
            <div className="text-xs tracking-[0.22em] uppercase font-mono mb-4" style={{ color: '#C9A84C' }}>↗ Join as a Master</div>
            <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 700, lineHeight: 1.1, color: 'var(--tf-text)' }}>
              Your track record<br/>is your product.
            </h2>
            <p className="mt-5 text-base leading-relaxed" style={{ color: 'var(--tf-muted)' }}>
              If you've been profitable for 3+ months, you already have everything you need. Create your account and start earning from your followers today.
            </p>

            <div className="mt-8 space-y-4">
              {[
                { label: 'Min. track record', value: '3 months' },
                { label: 'KYC required', value: 'Yes — ID + selfie' },
                { label: 'Performance fee range', value: '5% – 30%' },
                { label: 'Payout', value: 'Monthly · MAD or USDT' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-3 text-sm" style={{ borderBottom: '1px solid var(--tf-border)' }}>
                  <span style={{ color: 'var(--tf-subtle)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 600, color: 'var(--tf-text)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — auth panel */}
          <div className="w-full lg:w-auto reveal-right" style={{ minWidth: 380 }}>
            <AuthPanel />
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-10 px-6 text-center" style={{ borderTop: '1px solid var(--tf-border)' }}>
        <Link href="/" className="inline-flex items-center gap-2 justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14.5" stroke="#C9A84C" strokeWidth="1"/>
            <path d="M22 9 A 11 11 0 1 0 22 23 A 8 8 0 1 1 22 9 Z" fill="#C9A84C"/>
            <path d="M11 21 L21 11 M16 11 H21 V16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, color: 'var(--tf-text)' }}>Trade<span style={{ color: '#C9A84C' }}>Flow</span></span>
        </Link>
        <p className="text-xs" style={{ color: 'var(--tf-subtle)' }}>© 2026 TradeFlow · Morocco's first social copy-trading platform.</p>
        <p className="text-xs mt-2" style={{ color: 'var(--tf-subtle)' }}>
          Looking to copy traders instead?{' '}
          <Link href="/" style={{ color: '#C9A84C' }}>Go to the main platform →</Link>
        </p>
      </footer>
    </div>
  )
}
