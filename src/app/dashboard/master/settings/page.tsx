'use client'

import { useEffect, useState } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import type { Profile } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

export default function MasterSettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setName(data?.full_name ?? '')
      setLoading(false)
    }
    load()
  }, [])

  async function saveName() {
    setSaving(true); setSaved(false)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ full_name: name }).eq('id', user.id)
    setProfile(p => p ? { ...p, full_name: name } : p)
    setSaving(false); setSaved(true)
  }

  async function signOut() {
    setSigningOut(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center tf-page"><div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div></div>

  return (
    <div className="min-h-screen flex tf-page" style={{ fontFamily: SYS }}>
      <MasterSidebar profile={profile} onAvatarChange={url => setProfile(p => p ? { ...p, avatar_url: url } : p)} />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <h1 style={{ fontFamily: SYS, fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }}>Settings</h1>
            <div className="mt-3" style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 12px rgba(201,168,76,.45)' }} />
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl p-6 tf-card-bg">
              <div className="text-center mb-4">
                <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--tf-text)' }}>Display Name</h2>
                <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 10px rgba(201,168,76,.4)' }} />
              </div>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input mb-4" />
              {saved && <p className="text-xs font-mono mb-3" style={{ color: '#4ADE80' }}>Saved.</p>}
              <button onClick={saveName} disabled={saving} className="btn-gold rounded-xl px-6 py-2.5 text-sm font-semibold">
                {saving ? 'Saving…' : 'Save Name'}
              </button>
            </div>

            <div className="rounded-2xl p-6 tf-card-bg">
              <div className="text-center mb-3">
                <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--tf-text)' }}>Account</h2>
                <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 10px rgba(201,168,76,.4)' }} />
              </div>
              <p className="text-xs mb-4" style={{ color: 'var(--tf-subtle)' }}>Signed in as Master Trader</p>
              <button onClick={signOut} disabled={signingOut}
                className="rounded-xl px-6 py-2.5 text-sm font-semibold transition-all"
                style={{ border: '1px solid rgba(248,113,113,.4)', color: '#F87171', background: 'rgba(248,113,113,.06)' }}>
                {signingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
