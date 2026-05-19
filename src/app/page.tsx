'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frontCardRef = useRef<HTMLDivElement>(null)
  const backRightRef = useRef<HTMLDivElement>(null)
  const backLeftRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // ---- Scroll reveal ----
    const targets = document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.reveal-scale,.stagger')
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
    }, { threshold: 0, rootMargin: '60px' })
    targets.forEach(el => io.observe(el))
    // Immediately trigger any already-visible elements (above the fold)
    requestAnimationFrame(() => {
      targets.forEach(el => {
        const rect = (el as HTMLElement).getBoundingClientRect()
        if (rect.top < window.innerHeight + 60 && rect.bottom > -60) {
          el.classList.add('in')
          io.unobserve(el)
        }
      })
    })

    // ---- Blur headlines ----
    document.querySelectorAll('[data-blur]').forEach(h => {
      const words: HTMLElement[] = []
      function split(node: Node) {
        Array.from(node.childNodes).forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            const frag = document.createDocumentFragment()
            ;(child.textContent || '').split(/(\s+)/).forEach(w => {
              if (!w) return
              if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return }
              const span = document.createElement('span')
              span.className = 'bw'; span.textContent = w
              words.push(span); frag.appendChild(span)
            })
            node.replaceChild(frag, child)
          } else if ((child as Element).tagName !== 'BR') {
            if ((child as Element).children?.length === 0) {
              ;(child as Element).classList.add('bw'); words.push(child as HTMLElement)
            } else { split(child) }
          }
        })
      }
      split(h)
      words.forEach((el, i) => {
        const delay = i * 0.06 + Math.pow(i / Math.max(words.length, 1), 0.8) * 0.5
        el.style.transitionDelay = `${delay.toFixed(3)}s, ${delay.toFixed(3)}s, ${delay.toFixed(3)}s`
      })
      const hio = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) {
          h.classList.add('in')
          h.querySelectorAll('.bw').forEach(el => { (el as HTMLElement).style.filter = ''; (el as HTMLElement).style.transform = '' })
          hio.disconnect()
        }
      }, { threshold: 0.15 })
      hio.observe(h)
    })

    // ---- Particles ----
    const wrap = document.getElementById('particles')
    if (wrap) {
      let html = ''
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * 100, y = Math.random() * 100
        const d = (Math.random() * 4 + 2).toFixed(2), dl = (Math.random() * 5).toFixed(2)
        html += `<span style="left:${x}%;top:${y}%;animation-duration:${d}s;animation-delay:${dl}s"></span>`
      }
      wrap.innerHTML = html
    }

    // ---- Heatmap ----
    const hm = document.getElementById('heatmap')
    if (hm) {
      let html = ''
      for (let i = 0; i < 168; i++) {
        const r = Math.random(); const a = r < 0.08 ? 0.10 : r < 0.30 ? 0.35 : r < 0.65 ? 0.60 : 0.95
        html += `<span style="display:block;aspect-ratio:1;border-radius:2px;background:rgba(201,168,76,${a})"></span>`
      }
      hm.innerHTML = html
      hm.style.gridTemplateColumns = 'repeat(24,minmax(0,1fr))'
    }

    // ---- Trader card count-up ----
    const front = frontCardRef.current
    if (front) {
      function ease(t: number) { return 1 - Math.pow(1 - t, 3) }
      function animNum(el: Element | null, to: number, dur: number, fmt: (v: number) => string) {
        if (!el) return
        const t0 = performance.now()
        const step = (now: number) => {
          const t = Math.min(1, (now - t0) / dur)
          el.textContent = fmt(to * ease(t))
          if (t < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }
      const cio = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) {
          animNum(front.querySelector('[data-count-roi]'), 34.2, 1800, v => `+${v.toFixed(1)}%`)
          animNum(front.querySelector('[data-count-followers]'), 2847, 2000, v => Math.round(v).toLocaleString())
          animNum(front.querySelector('[data-count-win]'), 87, 1600, v => String(Math.round(v)))
          cio.disconnect()
        }
      }, { threshold: 0.3 })
      cio.observe(front)
    }

    // ---- Back card positions ----
    function placeCards() {
      const front = frontCardRef.current, br = backRightRef.current, bl = backLeftRef.current
      if (!front || !br || !bl) return
      const stack = front.parentElement!
      const sr = stack.getBoundingClientRect(), fr = front.getBoundingClientRect()
      const yTop = fr.top - sr.top, yBottom = fr.bottom - sr.top
      const yLeft = fr.left - sr.left, yRight = fr.right - sr.left
      br.style.left = (yRight - 100) + 'px'; br.style.top = (yTop + 10) + 'px'
      bl.style.left = (yLeft - 100) + 'px'; bl.style.top = (yBottom - 80) + 'px'
    }
    requestAnimationFrame(() => requestAnimationFrame(placeCards))
    window.addEventListener('resize', placeCards)

    // ---- Pricing canvas ----
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')!
      let w = 0, h = 0, t = 0
      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const rect = canvas.getBoundingClientRect()
        w = rect.width; h = rect.height
        canvas.width = w * dpr; canvas.height = h * dpr
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
      resize(); window.addEventListener('resize', resize)
      const isDark = () => document.documentElement.classList.contains('dark')
      let raf = 0
      const frame = () => {
        t += 0.004
        if (isDark()) { const g = ctx.createLinearGradient(0,0,0,h); g.addColorStop(0,'#0A0C0F'); g.addColorStop(1,'#111418'); ctx.fillStyle = g }
        else           { const g = ctx.createLinearGradient(0,0,0,h); g.addColorStop(0,'#FAFAF7'); g.addColorStop(1,'#F0EDE8'); ctx.fillStyle = g }
        ctx.fillRect(0, 0, w, h)
        for (let i = 0; i < 6; i++) {
          const phase = t + i * 0.7, yBase = h * (0.15 + i * 0.13)
          ctx.beginPath(); ctx.moveTo(0, yBase)
          for (let s = 0; s <= 60; s++) {
            ctx.lineTo((s / 60) * w, yBase + Math.sin(phase + s * 0.18) * 30 + Math.sin(phase * 0.6 + s * 0.07) * 60)
          }
          const grad = ctx.createLinearGradient(0,0,w,0)
          grad.addColorStop(0,'rgba(201,168,76,0)'); grad.addColorStop(0.5, isDark() ? 'rgba(230,199,90,0.85)' : 'rgba(201,168,76,0.55)'); grad.addColorStop(1,'rgba(201,168,76,0)')
          ctx.strokeStyle = grad; ctx.lineWidth = 1 + (i % 3) * 0.6; ctx.stroke()
        }
        raf = requestAnimationFrame(frame)
      }
      frame()
      return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('resize', placeCards); io.disconnect() }
    }
  }, [])

  return (
    <div className="antialiased" style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>

      {/* ===== NAV ===== */}
      <header className="fixed top-4 inset-x-0 z-50 px-4">
        <nav className="glass max-w-6xl mx-auto rounded-full pl-5 pr-2 py-2 flex items-center gap-6" style={{ isolation: 'isolate' }}>
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="14.5" stroke="#C9A84C" strokeWidth="1"/>
              <path d="M22 9 A 11 11 0 1 0 22 23 A 8 8 0 1 1 22 9 Z" fill="#C9A84C"/>
              <path d="M11 21 L21 11 M16 11 H21 V16" stroke="currentColor" strokeWidth="1.2" className="logo-mark" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-syne)', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Trade<span style={{ color: '#C9A84C' }}>Flow</span>
            </span>
          </Link>

          <ul className="hidden md:flex items-center gap-7 text-sm mx-auto" style={{ color: 'var(--tf-muted)' }}>
            {[['#features','Features'],['#traders','Traders'],['#pricing','Pricing'],['#voices','Community']].map(([href,label]) => (
              <li key={href}><a href={href} className="hover:text-[#C9A84C] transition-colors">{label}</a></li>
            ))}
          </ul>

          <div className="flex items-center gap-2 ml-auto md:ml-0">
            <ThemeToggle size={10} />
            <Link href="/masters" className="btn-outline rounded-full px-4 py-2.5 text-sm font-medium tracking-tight hidden sm:inline-flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Become a Master
            </Link>
            <Link href="/login" className="btn-gold rounded-full px-5 py-2.5 text-sm font-semibold tracking-tight">Login</Link>
          </div>
        </nav>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex flex-col justify-center pt-28 pb-12 px-6 overflow-hidden">
        <div className="hero-bg">
          <div className="mesh"></div>
          <div className="rays"></div>
          <div className="particles" id="particles"></div>
          <svg className="lines" viewBox="0 0 1200 800" preserveAspectRatio="none">
            <g stroke="#C9A84C" strokeWidth=".4" fill="none" opacity=".7">
              <path d="M0,600 C200,520 400,640 700,540 S 1100,500 1200,560"/>
              <path d="M0,300 C300,240 500,360 800,260 S 1100,220 1200,280"/>
            </g>
          </svg>
        </div>

        <div className="relative max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
          <div className="hero-left">
            <div className="inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase font-mono border border-white/15 rounded-full px-3 py-1.5" style={{ color: 'var(--tf-muted)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#C9A84C' }}></span> Morocco · MT5 Powered
            </div>
            <h1 className="blur-headline mt-6 leading-[1.04] tracking-tight font-bold" data-blur
                style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(2.5rem,5.6vw,4.75rem)', letterSpacing: '-0.02em', color: 'var(--tf-text)' }}>
              Copy the best<br/>
              traders in Morocco.<br/>
              <em className="gold-shimmer not-italic">Automatically.</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed" style={{ color: 'var(--tf-muted)' }}>
              Join thousands of traders who grow their portfolio by following verified top performers — in one click.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn-gold rounded-full px-6 py-3.5 text-sm font-semibold tracking-tight">Start for Free</Link>
              <a href="#traders" className="btn-outline rounded-full px-6 py-3.5 text-sm font-medium tracking-tight inline-flex items-center gap-2">Browse Traders</a>
            </div>
            <div className="mt-10 flex items-center gap-4 text-xs font-mono" style={{ color: 'var(--tf-muted)' }}>
              <span>NO CARD REQUIRED</span><span className="w-1 h-1 rounded-full bg-current opacity-40"></span>
              <span>MT5 EXECUTION</span><span className="w-1 h-1 rounded-full bg-current opacity-40"></span>
              <span>VERIFIED TRADERS</span>
            </div>
          </div>

          {/* Stacked trader cards */}
          <div className="trader-stack hero-right">
            <div className="trader-card tc-back-right" ref={backRightRef}>
              <div className="flex items-center gap-3">
                <div className="tc-avatar tc-avatar-sm">BB</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[13px] font-medium truncate">Brahim B. <span className="tc-verified">✓</span></div>
                  <div className="text-[11px] font-mono truncate" style={{ color: 'rgba(246,244,239,.5)' }}>@brahim_fx</div>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <div className="tc-roi" style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem' }}>+22.7%</div>
                <div className="tc-pill">30D</div>
              </div>
            </div>

            <div className="trader-card tc-back-left" ref={backLeftRef}>
              <div className="flex items-center gap-3">
                <div className="tc-avatar tc-avatar-sm">FK</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[13px] font-medium truncate">Fatima Khalid <span className="tc-verified">✓</span></div>
                  <div className="text-[11px] font-mono truncate" style={{ color: 'rgba(246,244,239,.5)' }}>@fk_capital · Marrakech</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-widest font-mono" style={{ color: 'rgba(246,244,239,.5)' }}>30D ROI</div>
                <div className="tc-roi" style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem' }}>+18.4%</div>
              </div>
            </div>

            <div className="trader-card tc-front floaty" ref={frontCardRef}>
              <div className="tc-shimmer"></div>
              <div className="tc-live"><span className="tc-live-dot"></span>LIVE</div>
              <div className="flex items-center gap-4">
                <div className="tc-avatar">YE</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-base font-semibold truncate">Youssef El Amrani <span className="tc-verified tc-verified-lg">✓</span></div>
                  <div className="text-xs font-mono truncate" style={{ color: 'rgba(246,244,239,.55)' }}>@youssef_capital · Casablanca</div>
                </div>
              </div>
              <div className="mt-5 flex items-baseline gap-3">
                <div className="tc-roi-big" style={{ fontFamily: 'var(--font-syne)' }} data-count-roi>+0.0%</div>
                <div className="tc-pill tc-pill-lg">▲ 30D</div>
              </div>
              <svg viewBox="0 0 320 90" className="w-full h-20 mt-3" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity=".35"/>
                    <stop offset="100%" stopColor="#22C55E" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path className="spark-fill" fill="url(#sparkFill)" d="M0,72 L36,70 L72,64 L108,58 L144,50 L180,42 L216,36 L252,28 L288,22 L320,10 L320,90 L0,90 Z"/>
                <path className="spark-line" d="M0,72 L36,70 L72,64 L108,58 L144,50 L180,42 L216,36 L252,28 L288,22 L320,10" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"/>
                <circle className="spark-end-pulse" cx="320" cy="10" r="5" fill="#22C55E" fillOpacity=".25"/>
                <circle className="spark-end" cx="320" cy="10" r="4" fill="#22C55E"/>
              </svg>
              <div className="tc-divider"></div>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div>
                  <div style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem' }} data-count-followers>0</div>
                  <div className="text-[10px] uppercase tracking-widest font-mono mt-0.5" style={{ color: 'rgba(246,244,239,.5)' }}>Followers</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem' }}><span data-count-win>0</span>%</div>
                  <div className="text-[10px] uppercase tracking-widest font-mono mt-0.5" style={{ color: 'rgba(246,244,239,.5)' }}>Win Rate</div>
                </div>
              </div>
              <div className="tc-divider"></div>
              <Link href="/signup?role=trader" className="tc-cta mt-4">
                <span>Copy Trader</span><span className="tc-arrow">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="stats-section relative py-24 px-6">
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-14 reveal">
            <div className="text-xs tracking-[0.22em] uppercase font-mono" style={{ color: '#C9A84C' }}>↗ By the numbers</div>
            <h2 className="blur-headline mt-3 leading-none" data-blur style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 700 }}>Trusted by traders<br/>who measure everything.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger">
            {[
              { label: 'Community', value: '600K+', sub: 'Active members', icon: '●' },
              { label: 'Master Traders', value: '150+', sub: 'All verified · KYC checked', icon: '★' },
              { label: 'Copied Volume', value: '$2.4M+', sub: 'MT5 · Last 12 months', icon: '↑' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="stat-card reveal">
                <span className="glow"></span>
                <div className="text-[11px] font-mono uppercase tracking-widest" style={{ color: 'var(--tf-subtle)' }}>{label}</div>
                <div className="stat-num mt-6">{value}</div>
                <div className="mt-5 text-xs" style={{ color: 'var(--tf-muted)' }}>{sub}</div>
              </div>
            ))}
          </div>

          <div className="mt-20 reveal">
            <div className="text-center text-[11px] font-mono uppercase tracking-widest mb-8" style={{ color: 'var(--tf-subtle)' }}>Powered by MT5 · Trusted across MENA</div>
            <div className="logo-marquee overflow-hidden">
              <div className="logo-track">
                {['MetaTrader 5','Exness','XM','FxPro','IC Markets','Pepperstone','HFM','Vantage','MetaTrader 5','Exness','XM','FxPro','IC Markets','Pepperstone','HFM','Vantage'].map((n,i) => (
                  <span key={i} className="logo-pill">
                    {i % 2 === 0 && <span className="w-2 h-2 rounded-full" style={{ background: '#C9A84C' }}></span>}
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="relative max-w-6xl mx-auto px-6 py-28">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div className="reveal-left">
            <div className="text-xs tracking-[0.22em] uppercase font-mono" style={{ color: '#C9A84C' }}>↗ Capabilities</div>
            <h2 className="blur-headline mt-3 leading-none" data-blur style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700 }}>Everything you need<br/>to trade smarter.</h2>
          </div>
          <p className="max-w-md leading-relaxed reveal-right" style={{ color: 'var(--tf-muted)' }}>
            Six tools, one platform. Auto-execution, live communities, learning, and analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-5">

          {/* 01 — Auto Copy Trading — large hero card */}
          <div className="bento rounded-2xl p-8 md:col-span-4 relative overflow-hidden reveal">
            <div className="absolute top-6 right-6 text-[11px] font-mono tracking-widest" style={{ color: 'var(--tf-subtle)' }}>01</div>
            <div className="text-xs tracking-[0.2em] uppercase font-mono mb-4" style={{ color: '#C9A84C' }}>↗ Auto Copy Trading</div>
            <h3 style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(1.5rem,3vw,2.25rem)', fontWeight: 700, lineHeight: 1.1 }}>Mirror every trade,<br/>the instant it opens.</h3>
            <p className="mt-3 text-sm leading-relaxed max-w-sm" style={{ color: 'var(--tf-muted)' }}>MT5-powered, real-time execution. Sized to your balance, capped to your risk. Zero delay.</p>

            {/* Live trade mockup UI */}
            <div className="mt-7 rounded-2xl p-5 relative overflow-hidden" style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22C55E' }}/>
                  <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color: '#22C55E' }}>Live Copy · MT5</span>
                </div>
                <span className="text-[11px] font-mono" style={{ color: 'var(--tf-subtle)' }}>Youssef El Amrani</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Symbol', value: 'XAUUSD', sub: 'Gold' },
                  { label: 'Entry', value: '2,341.50', sub: 'Buy' },
                  { label: 'Your size', value: '0.02 lot', sub: 'Auto-scaled' },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="rounded-xl p-3" style={{ background: 'var(--tf-page)', border: '1px solid var(--tf-border)' }}>
                    <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--tf-subtle)' }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--tf-text)' }}>{value}</div>
                    <div className="text-[10px] font-mono mt-0.5" style={{ color: '#C9A84C' }}>{sub}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: 'var(--tf-subtle)' }}>
                  <span>Copy ratio</span><span style={{ color: '#C9A84C' }}>78%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--tf-border)' }}>
                  <div className="h-full rounded-full" style={{ width: '78%', background: 'linear-gradient(90deg,#C9A84C,#E0C26A)' }}/>
                </div>
              </div>
            </div>

            {/* Heatmap */}
            <div className="mt-5 grid gap-[3px]" id="heatmap" style={{ gridTemplateColumns: 'repeat(24,minmax(0,1fr))' }}/>
            <div className="mt-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--tf-subtle)' }}>
              <span>Mon</span><span className="flex-1 h-px bg-current opacity-20"/><span>Sun</span>
            </div>
          </div>

          {/* 02 — Live Communities */}
          <div className="bento rounded-2xl p-7 md:col-span-2 reveal overflow-hidden">
            <div className="flex items-start justify-between mb-6">
              <div className="bento-icon w-11 h-11 rounded-xl grid place-items-center" style={{ border: '1px solid rgba(201,168,76,.4)', background: 'rgba(201,168,76,.1)', color: '#C9A84C' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <span className="text-[11px] font-mono tracking-widest" style={{ color: 'var(--tf-subtle)' }}>02</span>
            </div>
            {/* Voice room visual */}
            <div className="flex items-center justify-center gap-[-8px] mb-4">
              {['YA','SC','MB','FK','BB'].map((init, i) => (
                <div key={init} className="w-10 h-10 rounded-full grid place-items-center text-xs font-bold border-2 -ml-2 first:ml-0" style={{ background: `hsl(${40 + i*15},60%,${45+i*4}%)`, color: '#fff', borderColor: 'var(--tf-card)', fontFamily: 'var(--font-syne)', zIndex: 5 - i }}>
                  {init}
                </div>
              ))}
              <div className="w-10 h-10 rounded-full grid place-items-center text-[10px] font-mono -ml-2 border-2" style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)', color: 'var(--tf-subtle)' }}>+142</div>
            </div>
            {/* Waveform */}
            <div className="flex items-center justify-center gap-[3px] h-10 mb-5">
              {[3,6,10,14,18,14,22,16,10,14,18,22,16,10,6,14,18,10,6,4].map((h, i) => (
                <div key={i} className="rounded-full" style={{ width: 3, height: h, background: i % 3 === 0 ? '#C9A84C' : 'var(--tf-border)', opacity: i % 5 === 0 ? 1 : 0.6 }}/>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22C55E' }}/>
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#22C55E' }}>3 rooms live now</span>
            </div>
            <h3 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.25rem', fontWeight: 700, marginTop: '0.5rem' }}>Live Communities</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--tf-muted)' }}>Setups, voice rooms, post-trade breakdowns from the traders you copy.</p>
          </div>

          {/* 03 — Real-time Analytics */}
          <div className="bento rounded-2xl p-7 md:col-span-2 reveal">
            <div className="flex items-start justify-between mb-5">
              <div className="bento-icon w-11 h-11 rounded-xl grid place-items-center" style={{ border: '1px solid rgba(201,168,76,.4)', background: 'rgba(201,168,76,.1)', color: '#C9A84C' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
              </div>
              <span className="text-[11px] font-mono tracking-widest" style={{ color: 'var(--tf-subtle)' }}>03</span>
            </div>
            {/* Donut / gauge */}
            <div className="flex items-center justify-center my-4">
              <div className="relative" style={{ width: 110, height: 110 }}>
                <svg viewBox="0 0 110 110" width="110" height="110">
                  <circle cx="55" cy="55" r="44" fill="none" stroke="var(--tf-border)" strokeWidth="10"/>
                  <circle cx="55" cy="55" r="44" fill="none" stroke="#C9A84C" strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 44 * 0.82} ${2 * Math.PI * 44}`}
                    strokeLinecap="round" strokeDashoffset={2 * Math.PI * 44 * 0.25}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '55px 55px' }}/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--tf-text)' }}>82%</span>
                  <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: 'var(--tf-subtle)' }}>Win Rate</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[{ v:'2.4', l:'Sharpe' },{ v:'-6%', l:'Max DD' },{ v:'147', l:'Trades' }].map(({ v, l }) => (
                <div key={l} className="text-center rounded-lg py-2" style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)' }}>
                  <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--tf-text)' }}>{v}</div>
                  <div className="text-[9px] font-mono uppercase tracking-wider mt-0.5" style={{ color: 'var(--tf-subtle)' }}>{l}</div>
                </div>
              ))}
            </div>
            <h3 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.15rem', fontWeight: 700, marginTop: '1.25rem' }}>Real-time Analytics</h3>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--tf-muted)' }}>Track every position, every fee, every trader — live.</p>
          </div>

          {/* 04 — Courses & Learning */}
          <div className="bento rounded-2xl p-7 md:col-span-2 reveal">
            <div className="flex items-start justify-between mb-5">
              <div className="bento-icon w-11 h-11 rounded-xl grid place-items-center" style={{ border: '1px solid rgba(201,168,76,.4)', background: 'rgba(201,168,76,.1)', color: '#C9A84C' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
              <span className="text-[11px] font-mono tracking-widest" style={{ color: 'var(--tf-subtle)' }}>04</span>
            </div>
            <div className="space-y-2.5 my-4">
              {[
                { label: 'SMC Fundamentals', pct: 100, done: true },
                { label: 'Gold Trading Masterclass', pct: 68, done: false },
                { label: 'Risk Management', pct: 35, done: false },
              ].map(({ label, pct, done }) => (
                <div key={label}>
                  <div className="flex justify-between text-[10px] font-mono mb-1" style={{ color: 'var(--tf-subtle)' }}>
                    <span>{label}</span>
                    <span style={{ color: done ? '#22C55E' : '#C9A84C' }}>{done ? '✓' : `${pct}%`}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--tf-border)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: done ? '#22C55E' : 'linear-gradient(90deg,#C9A84C,#E0C26A)' }}/>
                  </div>
                </div>
              ))}
            </div>
            <h3 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.15rem', fontWeight: 700, marginTop: '1.25rem' }}>Courses & Learning</h3>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--tf-muted)' }}>Masterclasses from the traders you copy. Darija, French, English.</p>
          </div>

          {/* 05 — Rebate System */}
          <div className="bento rounded-2xl p-7 md:col-span-2 reveal">
            <div className="flex items-start justify-between mb-5">
              <div className="bento-icon w-11 h-11 rounded-xl grid place-items-center" style={{ border: '1px solid rgba(201,168,76,.4)', background: 'rgba(201,168,76,.1)', color: '#C9A84C' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </div>
              <span className="text-[11px] font-mono tracking-widest" style={{ color: 'var(--tf-subtle)' }}>05</span>
            </div>
            <div className="my-4 text-center">
              <div className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--tf-subtle)' }}>Cashback earned · this week</div>
              <div style={{ fontFamily: 'var(--font-syne)', fontSize: '2.5rem', fontWeight: 800, color: '#C9A84C', lineHeight: 1 }}>+340</div>
              <div className="text-sm font-mono mt-1" style={{ color: 'var(--tf-muted)' }}>MAD</div>
              <div className="mt-4 flex justify-center gap-1">
                {[40,65,50,80,55,90,75].map((h, i) => (
                  <div key={i} className="rounded-sm" style={{ width: 14, height: h * 0.6, background: i === 5 ? '#C9A84C' : 'var(--tf-border)', alignSelf: 'flex-end' }}/>
                ))}
              </div>
            </div>
            <h3 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.15rem', fontWeight: 700, marginTop: '1rem' }}>Rebate System</h3>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--tf-muted)' }}>Earn cashback on every trade you copy. Paid weekly, automatically.</p>
          </div>

          {/* 06 — Web · Mobile · Tablet — full width */}
          <div className="bento rounded-2xl p-8 md:col-span-6 reveal overflow-hidden relative">
            <div className="absolute top-6 right-6 text-[11px] font-mono tracking-widest" style={{ color: 'var(--tf-subtle)' }}>06</div>
            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1">
                <div className="bento-icon w-11 h-11 rounded-xl grid place-items-center mb-5" style={{ border: '1px solid rgba(201,168,76,.4)', background: 'rgba(201,168,76,.1)', color: '#C9A84C' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                </div>
                <h3 style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 700 }}>Web · Mobile · Tablet</h3>
                <p className="mt-3 max-w-sm leading-relaxed" style={{ color: 'var(--tf-muted)' }}>One account, every screen. Open positions on the go, monitor from your desk, follow traders from your couch.</p>
              </div>
              {/* Device mockup row */}
              <div className="flex items-end gap-4 flex-shrink-0">
                {/* Desktop */}
                <div className="rounded-xl overflow-hidden" style={{ width: 200, border: '2px solid var(--tf-border)', background: 'var(--tf-card-inner)' }}>
                  <div className="flex gap-1 p-2" style={{ borderBottom: '1px solid var(--tf-border)' }}>
                    {[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full" style={{ background: i===0?'#F87171':i===1?'#FBBF24':'#4ADE80' }}/>)}
                  </div>
                  <div className="p-3 space-y-1.5">
                    <div className="h-2 rounded-full w-3/4" style={{ background: 'var(--tf-border)' }}/>
                    <div className="h-2 rounded-full w-1/2" style={{ background: 'var(--tf-border)' }}/>
                    <div className="h-8 rounded-lg mt-2" style={{ background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.25)' }}/>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      <div className="h-6 rounded-md" style={{ background: 'var(--tf-border)' }}/>
                      <div className="h-6 rounded-md" style={{ background: 'var(--tf-border)' }}/>
                    </div>
                  </div>
                </div>
                {/* Tablet */}
                <div className="rounded-xl overflow-hidden" style={{ width: 130, border: '2px solid var(--tf-border)', background: 'var(--tf-card-inner)' }}>
                  <div className="p-2 space-y-1.5">
                    <div className="h-2 rounded-full w-2/3" style={{ background: 'var(--tf-border)' }}/>
                    <div className="h-6 rounded-lg" style={{ background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.25)' }}/>
                    <div className="h-2 rounded-full" style={{ background: 'var(--tf-border)' }}/>
                    <div className="h-2 rounded-full w-3/4" style={{ background: 'var(--tf-border)' }}/>
                    <div className="h-12 rounded-lg" style={{ background: 'var(--tf-border)' }}/>
                  </div>
                </div>
                {/* Phone */}
                <div className="rounded-2xl overflow-hidden" style={{ width: 80, border: '2px solid var(--tf-border)', background: 'var(--tf-card-inner)' }}>
                  <div className="flex justify-center py-1.5" style={{ borderBottom: '1px solid var(--tf-border)' }}>
                    <div className="w-8 h-1 rounded-full" style={{ background: 'var(--tf-border)' }}/>
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div className="h-1.5 rounded-full w-3/4 mx-auto" style={{ background: 'var(--tf-border)' }}/>
                    <div className="h-5 rounded-lg" style={{ background: 'rgba(201,168,76,.2)', border: '1px solid rgba(201,168,76,.3)' }}/>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--tf-border)' }}/>
                    <div className="h-1.5 rounded-full w-2/3" style={{ background: 'var(--tf-border)' }}/>
                    <div className="h-8 rounded-xl" style={{ background: 'var(--tf-border)' }}/>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ===== FEATURED TRADERS ===== */}
      <section id="traders" className="ai-section relative py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
            <div className="reveal-left">
              <div className="text-xs tracking-[0.22em] uppercase font-mono" style={{ color: '#C9A84C' }}>↗ Featured Traders</div>
              <h2 className="blur-headline mt-3 leading-none" data-blur style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700 }}>Top performers,<br/>this month.</h2>
            </div>
            <p className="max-w-md leading-relaxed reveal-right" style={{ color: 'var(--tf-muted)' }}>Verified, audited, and ranked by 30-day performance.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 stagger">
            {[
              {
                init:'YA', name:'Youssef Amrani', loc:'Casablanca · 4y track', roi:'+34.2%', win:82, followers:'14.2k', featured:true,
                spark: 'M0,78 C20,76 36,72 60,66 C80,61 100,55 130,47 C155,40 175,33 205,24 C225,18 248,12 280,7 L320,4',
              },
              {
                init:'SC', name:'Salma Chraibi',  loc:'Rabat · Smart money', roi:'+21.7%', win:76, followers:'9.6k', featured:false,
                spark: 'M0,80 C25,79 45,77 70,73 C95,69 115,64 140,57 C165,50 185,44 210,37 C235,30 258,23 290,16 L320,12',
              },
              {
                init:'MB', name:'Mehdi Benjelloun',loc:'Marrakech · Indices', roi:'+18.4%', win:71, followers:'6.1k', featured:false,
                spark: 'M0,82 C20,81 42,79 68,75 C90,72 112,68 138,62 C162,56 184,50 210,43 C236,36 260,28 292,20 L320,16',
              },
            ].map(({ init, name, loc, roi, win, followers, featured, spark }) => {
              const gradId = `sf-${init}`
              return (
              <div key={name} className="ai-card p-7 reveal flex flex-col" style={{ minHeight: 480 }}>
                {featured && <div className="absolute top-5 right-5 text-[10px] font-mono uppercase tracking-widest border rounded-full px-2.5 py-1" style={{ color: '#C9A84C', borderColor: 'rgba(201,168,76,.4)', background: 'rgba(201,168,76,.1)' }}>★ Top Performer</div>}
                <div className="ai-content h-full flex flex-col">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full grid place-items-center font-bold shadow-lg" style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)', color: '#1F2329', fontSize: '1.5rem', fontFamily: 'var(--font-syne)', boxShadow: '0 8px 20px rgba(201,168,76,.2)' }}>{init}</div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontFamily: 'var(--font-syne)', fontSize: '1.1rem', color: 'var(--tf-text)' }}>{name}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#C9A84C"><path d="M12 2l2.4 4.8L20 8l-4 3.9.9 5.5L12 14.8 7.1 17.4 8 11.9 4 8l5.6-1.2z"/></svg>
                      </div>
                      <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--tf-subtle)' }}>{loc}</div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[11px] font-mono uppercase tracking-widest" style={{ color: 'var(--tf-subtle)' }}>30-Day ROI</div>
                      <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md" style={{ background: 'rgba(34,197,94,.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,.25)' }}>▲ 30D</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-syne)', fontSize: '2.75rem', fontWeight: 700, color: '#22C55E', lineHeight: 1.1 }}>{roi}</div>
                  </div>

                  {/* Sparkline chart */}
                  <div className="mt-3 rounded-xl overflow-hidden" style={{ background: 'rgba(34,197,94,.04)', border: '1px solid rgba(34,197,94,.1)' }}>
                    <svg viewBox="0 0 320 90" className="w-full" style={{ height: 80, display: 'block' }} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#22C55E" stopOpacity="0.3"/>
                          <stop offset="100%" stopColor="#22C55E" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <path fill={`url(#${gradId})`} d={`${spark} L320,90 L0,90 Z`}/>
                      <path d={spark} fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="320" cy={spark.match(/L320,(\d+)/)?.[1] ?? '4'} r="5" fill="#22C55E" fillOpacity="0.3"/>
                      <circle cx="320" cy={spark.match(/L320,(\d+)/)?.[1] ?? '4'} r="3" fill="#22C55E"/>
                    </svg>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="ai-mock-input p-3">
                      <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--tf-subtle)' }}>Win Rate</div>
                      <div style={{ fontFamily: 'var(--font-syne)', fontSize: '1.1rem', color: 'var(--tf-text)', marginTop: '0.25rem' }}>{win}<span style={{ color: '#C9A84C', fontSize: '0.875rem' }}>%</span></div>
                    </div>
                    <div className="ai-mock-input p-3">
                      <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--tf-subtle)' }}>Followers</div>
                      <div style={{ fontFamily: 'var(--font-syne)', fontSize: '1.1rem', color: 'var(--tf-text)', marginTop: '0.25rem' }}>{followers}</div>
                    </div>
                  </div>
                  <Link href="/signup?role=trader" className={`rounded-full px-5 py-3 text-sm font-semibold tracking-tight text-center mt-5 ${featured ? 'btn-gold' : 'btn-outline'}`}>Copy Trader</Link>
                </div>
              </div>
            )})}
          </div>

          <div className="text-center mt-12 reveal">
            <Link href="/marketplace" className="text-sm font-mono hover:underline underline-offset-4" style={{ color: 'rgba(201,168,76,.8)' }}>Browse all 150+ master traders →</Link>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how" className="relative">
        <div className="max-w-5xl mx-auto px-6 py-28">
          <div className="text-center max-w-2xl mx-auto reveal">
            <div className="text-xs tracking-[0.22em] uppercase font-mono" style={{ color: '#C9A84C' }}>↗ How it works</div>
            <h2 className="blur-headline mt-3 leading-none" data-blur style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700 }}>Start copying<br/>in three steps.</h2>
            <p className="mt-5 leading-relaxed" style={{ color: 'var(--tf-muted)' }}>No code. No callbacks. Less than nine minutes from sign-up to first copy.</p>
          </div>
          <ol className="mt-20 relative stagger">
            <span className="absolute left-[27px] top-2 bottom-2 w-px" style={{ background: 'linear-gradient(180deg, transparent, rgba(201,168,76,.4), transparent)' }}></span>
            {[
              { n:'01', title:'Create your account.', desc:'Sign up with email or phone. Verify your identity. Connect MT5 in two clicks — read-trade scopes only, never withdraw.', time:'~ 2 minutes' },
              { n:'02', title:'Browse & follow traders.', desc:'Filter by ROI, win rate, drawdown, asset class. Read their thesis. Watch their last 20 trades. Pick the ones whose style fits yours.', time:'~ 4 minutes' },
              { n:'03', title:'Auto-copy their trades.', desc:'Set your copy ratio and risk caps. The moment they open a position, your account mirrors it — sized to your balance, capped to your rules.', time:'~ 3 minutes' },
            ].map(({ n, title, desc, time }) => (
              <li key={n} className="relative pl-20 pb-14 last:pb-0 reveal">
                <div className="step-dot absolute left-0 top-0 w-14 h-14 rounded-full grid place-items-center" style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem', color: '#C9A84C' }}>{n}</div>
                <h3 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.75rem', fontWeight: 700 }}>{title}</h3>
                <p className="mt-2 max-w-xl leading-relaxed" style={{ color: 'var(--tf-muted)' }}>{desc}</p>
                <div className="mt-4 inline-flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--tf-muted)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }}></span> {time}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="pricing-stage relative py-28 px-6">
        <canvas ref={canvasRef} id="pricingCanvas" aria-hidden="true" style={{ position:'absolute',inset:0,width:'100%',height:'100%',opacity:.3 }}/>
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto reveal">
            <div className="text-xs tracking-[0.22em] uppercase font-mono" style={{ color: '#C9A84C' }}>↗ Pricing</div>
            <h2 className="blur-headline mt-3 leading-none" data-blur style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700 }}>One platform.<br/>Three plans.</h2>
            <p className="mt-5 leading-relaxed" style={{ color: 'var(--tf-muted)' }}>Start free. Upgrade when copying has paid for itself.</p>
          </div>
          <div className="mt-16 grid md:grid-cols-3 gap-6 items-stretch stagger">
            {[
              { name:'Free', price:'0', unit:'MAD', sub:'Forever · no card needed', featured:false, cta:'Start Free', href:'/signup',
                features:['Follow 1 trader','Basic analytics','MT5 auto-copy execution','Email support'] },
              { name:'Pro', price:'99', unit:'MAD/mo', sub:'Billed monthly · cancel anytime', featured:true, cta:'Go Pro', href:'/signup?plan=pro',
                features:['Follow up to 5 traders','Full real-time analytics','Community access · voice rooms','Free course library','Priority chat support'] },
              { name:'Elite', price:'249', unit:'MAD/mo', sub:'For full-time traders', featured:false, cta:'Go Elite', href:'/signup?plan=elite',
                features:['Unlimited traders','Exclusive paid courses','Higher rebate tier','24/7 priority support','Early access to new traders'] },
            ].map(({ name, price, unit, sub, featured, cta, href, features }) => (
              <div key={name} className={`price-card rounded-2xl p-7 flex flex-col relative ${featured ? 'featured' : ''}`}>
                {featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 btn-gold text-[11px] tracking-[0.18em] uppercase font-semibold rounded-full px-3 py-1">★ Most Popular</div>}
                <div className="text-xs uppercase tracking-widest font-mono" style={{ color: featured ? '#C9A84C' : 'var(--tf-muted)' }}>{name}</div>
                <div style={{ fontFamily: 'var(--font-syne)', fontSize: '3rem', fontWeight: 700, marginTop: '0.75rem' }}>{price}<span className="text-xl" style={{ color: 'var(--tf-subtle)' }}> {unit}</span></div>
                <div className="text-sm mt-1" style={{ color: 'var(--tf-muted)' }}>{sub}</div>
                <ul className="mt-6 space-y-3 text-sm flex-1">
                  {features.map(f => <li key={f} className="flex items-start gap-2"><span style={{ color: '#C9A84C', marginTop: '0.1rem' }}>✓</span> {f}</li>)}
                </ul>
                <Link href={href} className={`rounded-full px-5 py-3 text-sm font-semibold tracking-tight mt-8 text-center ${featured ? 'btn-gold' : 'btn-outline'}`}>{cta}</Link>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center text-xs font-mono" style={{ color: 'var(--tf-subtle)' }}>All plans include 256-bit encryption · Read-only execution scopes · MT5 Powered</div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section id="voices" className="max-w-6xl mx-auto px-6 py-28">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-14">
          <div className="reveal-left">
            <div className="text-xs tracking-[0.22em] uppercase font-mono" style={{ color: '#C9A84C' }}>↗ Voices</div>
            <h2 className="blur-headline mt-3 leading-none" data-blur style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700 }}>From traders who<br/>actually sleep now.</h2>
          </div>
          <div className="flex items-center gap-3 text-sm reveal-right">
            <div className="flex">{'★★★★★'.split('').map((s,i) => <span key={i} className="star">{s}</span>)}</div>
            <span className="font-mono" style={{ color: 'var(--tf-muted)' }}>4.9 · 2,418 reviews</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5 stagger">
          {[
            [
              { quote: '"I copied Yassine for three months. My account grew 28% — I literally did nothing."', name:'Mehdi Bennani', loc:'Casablanca · follower', init:'M', featured:false },
              { quote: 'The free courses taught me what hours of YouTube couldn\'t. The voice rooms make trading feel less lonely.', name:'Salma El Khatib', loc:'Rabat · Pro plan', init:'S', featured:false },
            ],
            [
              { quote: '"For the first time, I trade with people who speak Darija. I follow two pros, sleep at night, and check my account once a day."', name:'Anas Ouahbi', loc:'Marrakech · Elite plan', init:'A', featured:true },
              { quote: 'Setup took 8 minutes. By Friday I was up 4%. I\'m a teacher — not a trader — and that\'s exactly the point.', name:'Leila Tazi', loc:'Tangier · Free plan', init:'L', featured:false },
            ],
            [
              { quote: 'As a featured trader I\'ve earned more in performance fees than I did from my own trades last year.', name:'Yassine Berrada', loc:'Casablanca · Featured Trader', init:'Y', featured:false },
              { quote: '"Finally, a Moroccan platform that takes us seriously. No more sketchy WhatsApp signal groups."', name:'Omar Cherkaoui', loc:'Fès · Pro plan', init:'O', featured:false },
            ],
          ].map((col, ci) => (
            <div key={ci} className="space-y-5 reveal">
              {col.map(({ quote, name, loc, init, featured }) => (
                <article key={name} className={`bento rounded-2xl p-6 ${featured ? 'ring-1 ring-gold border-gold/50' : ''}`} style={featured ? { borderColor: 'rgba(201,168,76,.5)' } : {}}>
                  <div className="flex items-center gap-1 text-sm">{'★★★★★'.split('').map((s,i) => <span key={i} className="star">{s}</span>)}</div>
                  <p className={`leading-relaxed mt-4 ${featured ? 'text-2xl' : 'text-sm'}`} style={{ fontFamily: featured ? 'var(--font-syne)' : undefined }}>{quote}</p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full grid place-items-center font-bold" style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)', color: '#1F2329', fontFamily: 'var(--font-syne)' }}>{init}</div>
                    <div>
                      <div className="text-sm font-medium">{name}</div>
                      <div className="text-xs font-mono" style={{ color: 'var(--tf-muted)' }}>{loc}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA BANNER ===== */}
      <section className="px-6 pb-28">
        <div className="cta-banner relative max-w-6xl mx-auto rounded-3xl px-10 py-16 md:px-16 md:py-20 overflow-hidden reveal-scale">
          <svg className="absolute inset-0 w-full h-full opacity-50" viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true">
            <g stroke="#C9A84C" strokeWidth=".4" fill="none">
              <path d="M-50,200 C200,140 400,260 700,180 S 1100,140 1250,200"/>
              <path d="M-50,260 C200,210 400,310 700,250 S 1100,200 1250,260"/>
            </g>
          </svg>
          <div className="relative max-w-3xl">
            <div className="text-xs tracking-[0.22em] uppercase font-mono" style={{ color: '#C9A84C' }}>↗ Yallah</div>
            <h2 className="blur-headline mt-4 leading-none" data-blur style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700 }}>Stop guessing.<br/><span className="gold-shimmer">Start copying.</span></h2>
            <p className="mt-6 max-w-xl" style={{ color: 'rgba(240,237,232,.75)' }}>Free forever. No card. Pick a trader, set your ratio, and let the pros do what they do best.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn-gold rounded-full px-7 py-3.5 text-sm font-semibold tracking-tight">Create Free Account</Link>
              <Link href="/marketplace" className="rounded-full px-7 py-3.5 text-sm font-medium tracking-tight border transition-colors" style={{ borderColor: 'rgba(240,237,232,.2)', color: 'rgba(240,237,232,.8)' }}>Browse Traders</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="px-6 pt-20 pb-10 reveal">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-12 gap-10">
            <div className="md:col-span-5">
              <Link href="/" className="flex items-center gap-2.5">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="14.5" stroke="#C9A84C" strokeWidth="1"/>
                  <path d="M22 9 A 11 11 0 1 0 22 23 A 8 8 0 1 1 22 9 Z" fill="#C9A84C"/>
                  <path d="M11 21 L21 11 M16 11 H21 V16" stroke="currentColor" className="logo-mark" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontFamily: 'var(--font-syne)', fontSize: '1.25rem', fontWeight: 700 }}>TradeFlow<span style={{ color: '#C9A84C' }}>·</span>Trader</span>
              </Link>
              <p className="mt-5 text-sm leading-relaxed max-w-sm" style={{ color: 'var(--tf-muted)' }}>Morocco's first social copy-trading platform. Built for the next generation of Moroccan traders.</p>
            </div>
            {[
              { title:'Product', links:[['How it Works','/'],['Pricing','#pricing'],['Featured Traders','/marketplace'],['MT5 Setup','/']] },
              { title:'Company', links:[['About','/'],['Careers','/'],['Press','/'],['Contact','/']] },
              { title:'Resources', links:[['Free Courses','/'],['Telegram Community','/'],['Become a Featured Trader','/signup?role=master'],['Help Center','/']] },
            ].map(({ title, links }) => (
              <div key={title} className="md:col-span-2">
                <div className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--tf-subtle)' }}>{title}</div>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {links.map(([label, href]) => <li key={label}><Link href={href} className="hover:text-[#C9A84C] transition-colors">{label}</Link></li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="gold-rule mt-14"></div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono" style={{ color: 'var(--tf-subtle)' }}>
            <span>© 2026 TradeFlow Trader · Made in Morocco.</span>
            <span>From Casablanca, with discipline.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
