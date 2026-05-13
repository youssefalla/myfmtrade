'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

const STEPS = ['Profile', 'Trading Style', 'Pricing', 'Launch']
const INSTRUMENTS = ['Forex', 'Gold', 'Indices', 'Crypto', 'Oil', 'Stocks']

export default function MasterOnboarding() {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [data, setData] = useState({
    city: '', bio: '', style: '', instruments: [] as string[], fee: '10',
  })

  function next() { if (step < STEPS.length - 1) setStep(s => s + 1) }
  function back() { if (step > 0) setStep(s => s - 1) }

  async function launch() {
    setSaving(true); setError('')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upsert profile
      const { error: pErr } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name ?? '',
        role: 'master',
        city: data.city || null,
        bio: data.bio || null,
      })
      if (pErr) throw pErr

      // Upsert gig
      const { error: gErr } = await supabase.from('gigs').upsert({
        master_id: user.id,
        style: [data.style, ...data.instruments].filter(Boolean).join(' · ') || null,
        instruments: data.instruments,
        performance_fee: parseInt(data.fee),
        is_active: true,
      }, { onConflict: 'master_id' })
      if (gErr) throw gErr

      setDone(true)
      setStep(3)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 tf-page">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center gap-2">
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
                <div className="w-8 h-8 rounded-full grid place-items-center text-xs font-mono font-bold transition-all"
                  style={{ background: i <= step ? '#C9A84C' : 'var(--tf-border)', color: i <= step ? '#0A0C0F' : 'var(--tf-subtle)' }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider mt-1 hidden sm:block" style={{ color: i === step ? '#C9A84C' : 'var(--tf-subtle)' }}>{s}</div>
              </div>
              {i < STEPS.length - 1 && <div className="w-8 h-px mb-4" style={{ background: i < step ? '#C9A84C' : 'var(--tf-border)' }}/>}
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-8 tf-card-gold">
          {step === 0 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--tf-text)' }}>Setup your gig profile</h2>
              <p className="mt-2 text-sm mb-6" style={{ color: 'var(--tf-muted)' }}>This is what followers will see on your trader card.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>City</label>
                  <input value={data.city} onChange={e => setData(d => ({ ...d, city: e.target.value }))} placeholder="Casablanca" className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input"/>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Bio (short)</label>
                  <textarea value={data.bio} onChange={e => setData(d => ({ ...d, bio: e.target.value }))} placeholder="I trade SMC on gold & forex with 4 years of live track record." rows={3} className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none tf-input"/>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--tf-text)' }}>What do you trade?</h2>
              <p className="mt-2 text-sm mb-6" style={{ color: 'var(--tf-muted)' }}>Select your instruments and trading style.</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {INSTRUMENTS.map(inst => {
                  const sel = data.instruments.includes(inst)
                  return (
                    <button key={inst} onClick={() => setData(d => ({ ...d, instruments: sel ? d.instruments.filter(x => x !== inst) : [...d.instruments, inst] }))}
                      className="rounded-full px-4 py-2 text-sm font-mono transition-all"
                      style={{ border: sel ? '1px solid #C9A84C' : '1px solid var(--tf-border)', background: sel ? 'rgba(201,168,76,.15)' : 'transparent', color: sel ? '#C9A84C' : 'var(--tf-muted)' }}>
                      {inst}
                    </button>
                  )
                })}
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--tf-muted)' }}>Trading Style</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Scalping', 'Day Trading', 'Swing'].map(s => (
                    <button key={s} onClick={() => setData(d => ({ ...d, style: s }))}
                      className="rounded-xl p-3 text-sm font-medium transition-all"
                      style={{ border: data.style === s ? '1px solid #C9A84C' : '1px solid var(--tf-border)', background: data.style === s ? 'rgba(201,168,76,.1)' : 'var(--tf-card-inner)', color: data.style === s ? '#C9A84C' : 'var(--tf-muted)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--tf-text)' }}>Set your performance fee</h2>
              <p className="mt-2 text-sm mb-6" style={{ color: 'var(--tf-muted)' }}>You earn this % from your followers&apos; profits monthly.</p>
              <div className="flex items-center gap-4 mb-4">
                <input type="range" min="5" max="30" value={data.fee} onChange={e => setData(d => ({ ...d, fee: e.target.value }))} className="flex-1 accent-[#C9A84C]"/>
                <div style={{ fontFamily: 'var(--font-syne)', fontSize: '2rem', fontWeight: 700, color: '#C9A84C', minWidth: 70 }}>{data.fee}%</div>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.2)' }}>
                <div className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Example earnings</div>
                <div style={{ color: 'var(--tf-text)' }}>
                  If 100 followers each earn <span style={{ color: '#4ADE80' }}>+$500</span> → you earn <span style={{ color: '#C9A84C', fontWeight: 700 }}>${Math.round(100 * 500 * parseInt(data.fee) / 100).toLocaleString()}</span>
                </div>
              </div>
              {error && <p className="mt-4 text-xs font-mono" style={{ color: '#F87171' }}>{error}</p>}
            </div>
          )}

          {step === 3 && done && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full grid place-items-center mx-auto mb-4" style={{ background: 'rgba(74,222,128,.15)', border: '1px solid rgba(74,222,128,.3)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)' }}>Your gig is live!</h2>
              <p className="mt-3 text-sm mb-8" style={{ color: 'var(--tf-muted)' }}>Followers can now discover and copy you on the marketplace.</p>
              <Link href="/dashboard/master" className="btn-gold rounded-full px-8 py-3.5 text-sm font-semibold">Go to Master Dashboard →</Link>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 0 && step < 3 && (
              <button onClick={back} className="btn-outline rounded-xl px-6 py-3 text-sm font-medium flex-1">← Back</button>
            )}
            {step < 2 && (
              <button onClick={next} className="btn-gold rounded-xl py-3 text-sm font-semibold flex-1">Continue →</button>
            )}
            {step === 2 && (
              <button onClick={launch} disabled={saving} className="btn-gold rounded-xl py-3 text-sm font-semibold flex-1">
                {saving ? 'Saving…' : 'Launch My Gig →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
