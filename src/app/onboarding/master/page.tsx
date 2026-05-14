'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Camera } from 'lucide-react'

const STEPS = ['Photo', 'Profile', 'Trading Style', 'Pricing', 'Launch']
const INSTRUMENTS = ['Forex', 'Gold', 'Indices', 'Crypto', 'Oil', 'Stocks']

export default function MasterOnboarding() {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [data, setData] = useState({
    city: '', bio: '', style: '', instruments: [] as string[], fee: '10',
  })

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

  function next() {
    if (step === 0 && !avatarFile) { setError('Please upload a profile photo to continue.'); return }
    setError('')
    if (step < STEPS.length - 1) setStep(s => s + 1)
  }
  function back() { setError(''); if (step > 0) setStep(s => s - 1) }

  async function launch() {
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
        role: 'master',
        city: data.city || null,
        bio: data.bio || null,
        avatar_url: avatarUrl,
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

          {/* Step 0 — Photo */}
          {step === 0 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--tf-text)' }}>Upload your profile photo</h2>
              <p className="mt-2 text-sm mb-8" style={{ color: 'var(--tf-muted)' }}>Your photo will appear on your trader card in the marketplace.</p>
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

          {/* Step 1 — Profile */}
          {step === 1 && (
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

          {/* Step 2 — Trading Style */}
          {step === 2 && (
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

          {/* Step 3 — Pricing */}
          {step === 3 && (
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

          {/* Step 4 — Done */}
          {step === 4 && done && (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4" style={{ border: '2px solid #C9A84C' }}>
                {avatarPreview && <img src={avatarPreview} alt="You" className="w-full h-full object-cover" />}
              </div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)' }}>Your gig is live!</h2>
              <p className="mt-3 text-sm mb-8" style={{ color: 'var(--tf-muted)' }}>Followers can now discover and copy you on the marketplace.</p>
              <Link href="/dashboard/master" className="btn-gold rounded-full px-8 py-3.5 text-sm font-semibold">Go to Master Dashboard →</Link>
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
