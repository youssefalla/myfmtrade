'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

const STEPS = ['Broker', 'Risk Settings', 'Pick Trader', 'Activate']

export default function TraderOnboarding() {
  const [step, setStep] = useState(0)
  const [broker, setBroker] = useState('')
  const [risk, setRisk] = useState('5')

  const brokers = ['Exness', 'XM', 'IC Markets', 'Pepperstone', 'HFM', 'Vantage', 'FxPro', 'Other']

  return (
    <div className="min-h-screen flex items-center justify-center px-4 tf-page">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center gap-2 justify-center">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14.5" stroke="#C9A84C" strokeWidth="1"/><path d="M22 9 A 11 11 0 1 0 22 23 A 8 8 0 1 1 22 9 Z" fill="#C9A84C"/><path d="M11 21 L21 11 M16 11 H21 V16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, color: 'var(--tf-text)' }}>Trade<span style={{ color: '#C9A84C' }}>Flow</span></span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full grid place-items-center text-xs font-mono font-bold"
                  style={{ background: i <= step ? '#C9A84C' : 'var(--tf-border)', color: i <= step ? '#0A0C0F' : 'var(--tf-subtle)', border: i <= step ? 'none' : '1px solid var(--tf-border)' }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider mt-1 hidden sm:block" style={{ color: i === step ? '#C9A84C' : 'var(--tf-subtle)' }}>{s}</div>
              </div>
              {i < STEPS.length - 1 && <div className="w-8 h-px mb-4" style={{ background: i < step ? '#C9A84C' : 'var(--tf-border)' }}></div>}
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-8 tf-card-gold">
          {step === 0 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--tf-text)' }}>Create your trading account</h2>
              <p className="mt-2 text-sm mb-6" style={{ color: 'var(--tf-muted)' }}>Choose your broker. We&apos;ll connect via MT5 read-only API — we never withdraw.</p>
              <div className="grid grid-cols-2 gap-3">
                {brokers.map(b => (
                  <button key={b} onClick={() => setBroker(b)}
                    className="rounded-xl p-4 text-sm font-medium text-left transition-all"
                    style={{ border: broker === b ? '1px solid #C9A84C' : '1px solid var(--tf-border)', background: broker === b ? 'rgba(201,168,76,.1)' : 'var(--tf-card-inner)', color: broker === b ? '#C9A84C' : 'var(--tf-muted)' }}>
                    {b}
                  </button>
                ))}
              </div>
              {broker && (
                <div className="mt-5 space-y-4">
                  <input placeholder="MT5 Account Number" className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input"/>
                  <input placeholder="MT5 Investor Password (read-only)" type="password" className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input"/>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--tf-text)' }}>Set your risk limits</h2>
              <p className="mt-2 text-sm mb-6" style={{ color: 'var(--tf-muted)' }}>We&apos;ll never let a copied trade exceed these limits.</p>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--tf-muted)' }}>Max risk per trade</label>
                    <span style={{ fontFamily: 'var(--font-syne)', fontSize: '1.25rem', color: '#C9A84C' }}>{risk}%</span>
                  </div>
                  <input type="range" min="1" max="20" value={risk} onChange={e => setRisk(e.target.value)} className="w-full accent-[#C9A84C]"/>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.18)' }}>
                  <div className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--tf-muted)' }}>Risk profile</div>
                  <div style={{ color: 'var(--tf-text)' }}>
                    {parseInt(risk) <= 5 ? '🛡️ Conservative — Safe, slower growth' : parseInt(risk) <= 12 ? '⚖️ Balanced — Standard risk/reward' : '🔥 Aggressive — High potential, high risk'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--tf-text)' }}>Pick your first trader</h2>
              <p className="mt-2 text-sm mb-6" style={{ color: 'var(--tf-muted)' }}>You can change this anytime from your dashboard.</p>
              <div className="space-y-3">
                {[
                  { init:'YA', name:'Youssef Amrani', roi:'+34.2%', win:82 },
                  { init:'SC', name:'Salma Chraibi',  roi:'+21.7%', win:76 },
                  { init:'MB', name:'Mehdi Benjelloun',roi:'+18.4%', win:71 },
                ].map(({ init, name, roi, win }) => (
                  <div key={name} className="flex items-center gap-4 rounded-xl p-4 cursor-pointer transition-all" style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#C9A84C'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--tf-border)'}>
                    <div className="w-12 h-12 rounded-full grid place-items-center font-bold" style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)', color: '#1F2329', fontFamily: 'var(--font-syne)' }}>{init}</div>
                    <div className="flex-1">
                      <div className="font-medium" style={{ color: 'var(--tf-text)' }}>{name}</div>
                      <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--tf-subtle)' }}>Win rate: {win}%</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-syne)', color: '#4ADE80', fontSize: '1.25rem', fontWeight: 600 }}>{roi}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-6">
              <div className="text-6xl mb-4">✅</div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)' }}>You&apos;re all set!</h2>
              <p className="mt-3 text-sm mb-8" style={{ color: 'var(--tf-muted)' }}>Your account is connected. Trades will be copied automatically.</p>
              <Link href="/dashboard/copy" className="btn-gold rounded-full px-8 py-3.5 text-sm font-semibold">Go to Dashboard →</Link>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 0 && step < 3 && (
              <button onClick={() => setStep(s => s - 1)} className="btn-outline rounded-xl px-6 py-3 text-sm font-medium flex-1">← Back</button>
            )}
            {step < 3 && (
              <button onClick={() => setStep(s => s + 1)} className="btn-gold rounded-xl py-3 text-sm font-semibold flex-1">
                {step === 2 ? 'Activate Copy Trading 🚀' : 'Continue →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
