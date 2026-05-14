'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Camera } from 'lucide-react'
import type { Gig } from '@/types/database'

const STEPS = ['Photo', 'Broker', 'Risk Settings', 'Pick Trader', 'Activate']
const BROKERS = ['Exness', 'XM', 'IC Markets', 'Pepperstone', 'HFM', 'Vantage', 'FxPro', 'Other']

export default function TraderOnboarding() {
  const [step, setStep] = useState(0)
  const [broker, setBroker] = useState('')
  const [risk, setRisk] = useState('5')
  const [selectedMaster, setSelectedMaster] = useState<string | null>(null)
  const [masters, setMasters] = useState<Gig[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    async function loadMasters() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase
        .from('gigs')
        .select('*, profiles(*)')
        .eq('is_active', true)
        .limit(3)
      if (data) setMasters(data as Gig[])
    }
    if (step === 3) loadMasters()
  }, [step])

  function next() {
    if (step === 0 && !avatarFile) { setError('Please upload a profile photo to continue.'); return }
    setError('')
    if (step < STEPS.length - 1) setStep(s => s + 1)
  }
  function back() { setError(''); if (step > 0) setStep(s => s - 1) }

  async function activate() {
    setSaving(true); setError('')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload avatar
      let avatarUrl: string | null = null
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${user.id}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
        if (uploadError) throw new Error('Photo upload failed: ' + uploadError.message)
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = publicUrl
      }

      // Upsert profile
      const { error: pErr } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name ?? '',
        role: 'trader',
        city: null,
        bio: null,
        avatar_url: avatarUrl,
      })
      if (pErr) throw pErr

      // Follow selected master
      if (selectedMaster) {
        const { error: fErr } = await supabase.from('follows').upsert({
          trader_id: user.id,
          master_id: selectedMaster,
        }, { onConflict: 'trader_id,master_id' })
        if (fErr) throw fErr
      }

      setDone(true)
      setStep(4)
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
                <div className="w-8 h-8 rounded-full grid place-items-center text-xs font-mono font-bold"
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

          {/* Step 0 — Photo */}
          {step === 0 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--tf-text)' }}>Upload your profile photo</h2>
              <p className="mt-2 text-sm mb-8" style={{ color: 'var(--tf-muted)' }}>Add a photo so traders know who you are.</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <div className="flex flex-col items-center gap-4">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="relative w-32 h-32 rounded-full flex items-center justify-center transition-all overflow-hidden"
                  style={{ border: avatarFile ? '2px solid #C9A84C' : '2px dashed var(--tf-border)', background: 'var(--tf-card-inner)' }}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Camera size={28} style={{ color: 'var(--tf-subtle)' }} />
                      <span className="text-xs font-mono" style={{ color: 'var(--tf-subtle)' }}>Tap to upload</span>
                    </div>
                  )}
                  {avatarPreview && (
                    <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.45)' }}>
                      <Camera size={22} color="white" />
                    </div>
                  )}
                </button>
                <span className="text-xs font-mono" style={{ color: avatarFile ? '#C9A84C' : 'var(--tf-subtle)' }}>
                  {avatarFile ? avatarFile.name : 'Required — JPG, PNG or WEBP'}
                </span>
              </div>
              {error && <p className="mt-4 text-xs font-mono text-center" style={{ color: '#F87171' }}>{error}</p>}
            </div>
          )}

          {/* Step 1 — Broker */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--tf-text)' }}>Choose your broker</h2>
              <p className="mt-2 text-sm mb-6" style={{ color: 'var(--tf-muted)' }}>We connect via MT5 read-only API — we never withdraw.</p>
              <div className="grid grid-cols-2 gap-3">
                {BROKERS.map(b => (
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

          {/* Step 2 — Risk */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--tf-text)' }}>Set your risk limits</h2>
              <p className="mt-2 text-sm mb-6" style={{ color: 'var(--tf-muted)' }}>We never let a copied trade exceed these limits.</p>
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
                    {parseInt(risk) <= 5 ? 'Conservative — Safe, slower growth' : parseInt(risk) <= 12 ? 'Balanced — Standard risk/reward' : 'Aggressive — High potential, high risk'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Pick Trader */}
          {step === 3 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--tf-text)' }}>Pick your first trader</h2>
              <p className="mt-2 text-sm mb-6" style={{ color: 'var(--tf-muted)' }}>You can change this anytime from your dashboard.</p>
              {masters.length === 0 ? (
                <div className="text-sm text-center py-8" style={{ color: 'var(--tf-subtle)' }}>No masters available yet — skip and browse later.</div>
              ) : (
                <div className="space-y-3">
                  {masters.map(gig => {
                    const p = gig.profiles
                    const init = p?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'
                    return (
                      <div key={gig.id} onClick={() => setSelectedMaster(gig.master_id)}
                        className="flex items-center gap-4 rounded-xl p-4 cursor-pointer transition-all"
                        style={{ background: 'var(--tf-card-inner)', border: selectedMaster === gig.master_id ? '1px solid #C9A84C' : '1px solid var(--tf-border)' }}>
                        <div className="w-12 h-12 rounded-full grid place-items-center font-bold shrink-0 overflow-hidden"
                          style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)', color: '#1F2329', fontFamily: 'var(--font-syne)' }}>
                          {p?.avatar_url ? <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" /> : init}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium" style={{ color: 'var(--tf-text)' }}>{p?.full_name ?? 'Master Trader'}</div>
                          <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--tf-subtle)' }}>{gig.style ?? 'Trader'} · {gig.performance_fee}% fee</div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-syne)', color: '#4ADE80', fontSize: '1.1rem', fontWeight: 600 }}>{gig.roi_30d > 0 ? `+${gig.roi_30d}%` : '—'}</div>
                      </div>
                    )
                  })}
                </div>
              )}
              {error && <p className="mt-4 text-xs font-mono" style={{ color: '#F87171' }}>{error}</p>}
            </div>
          )}

          {/* Step 4 — Done */}
          {step === 4 && done && (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4" style={{ border: '2px solid #C9A84C' }}>
                {avatarPreview && <img src={avatarPreview} alt="You" className="w-full h-full object-cover" />}
              </div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)' }}>You&apos;re all set!</h2>
              <p className="mt-3 text-sm mb-8" style={{ color: 'var(--tf-muted)' }}>Your account is connected. Trades will be copied automatically.</p>
              <Link href="/dashboard/copy" className="btn-gold rounded-full px-8 py-3.5 text-sm font-semibold">Go to Dashboard →</Link>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 0 && step < 4 && (
              <button onClick={back} className="btn-outline rounded-xl px-6 py-3 text-sm font-medium flex-1">← Back</button>
            )}
            {step < 3 && (
              <button onClick={next} className="btn-gold rounded-xl py-3 text-sm font-semibold flex-1">Continue →</button>
            )}
            {step === 3 && (
              <button onClick={activate} disabled={saving} className="btn-gold rounded-xl py-3 text-sm font-semibold flex-1">
                {saving ? 'Activating…' : 'Activate Copy Trading →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
