'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Suspense } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'

function SignupForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError('')
    const fd = new FormData(e.currentTarget)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: fd.get('email') as string,
      password: fd.get('password') as string,
      options: { data: { role: 'master', full_name: fd.get('name') } },
    })
    if (error) { setError(error.message); setLoading(false); return }
    window.location.href = '/onboarding/master'
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 tf-page">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14.5" stroke="#C9A84C" strokeWidth="1"/>
              <path d="M22 9 A 11 11 0 1 0 22 23 A 8 8 0 1 1 22 9 Z" fill="#C9A84C"/>
              <path d="M11 21 L21 11 M16 11 H21 V16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-syne)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--tf-text)' }}>
              Trade<span style={{ color: '#C9A84C' }}>Flow</span>
            </span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="rounded-2xl p-8 tf-card-gold">
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)' }}>Create your account</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--tf-muted)' }}>Join TradeFlow as a master trader.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Full Name</label>
              <input name="name" type="text" required placeholder="Youssef Amrani"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Email</label>
              <input name="email" type="email" required placeholder="you@example.com"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Password</label>
              <input name="password" type="password" required placeholder="Min 8 characters" minLength={8}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input"
              />
            </div>
            {error && <p className="text-xs font-mono" style={{ color: '#F87171' }}>{error}</p>}
            <button type="submit" disabled={loading} className="btn-gold w-full rounded-xl py-3.5 text-sm font-semibold mt-2">
              {loading ? 'Creating account…' : 'Create Master Trader Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--tf-subtle)' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-medium" style={{ color: '#C9A84C' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>
}
