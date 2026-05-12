'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError('')
    const fd = new FormData(e.currentTarget)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: fd.get('email') as string,
      password: fd.get('password') as string,
    })
    if (error) { setError(error.message); setLoading(false); return }
    window.location.href = '/dashboard/copy'
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 tf-page">
      <div className="w-full max-w-md">
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
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)' }}>Welcome back</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--tf-muted)' }}>Sign in to your TradeFlow account.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Email</label>
              <input name="email" type="email" required placeholder="you@example.com"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all tf-input"
                onFocus={e => e.target.style.borderColor = '#C9A84C'}
                onBlur={e => e.target.style.borderColor = 'var(--tf-input-border)'}
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Password</label>
              <input name="password" type="password" required placeholder="••••••••"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all tf-input"
                onFocus={e => e.target.style.borderColor = '#C9A84C'}
                onBlur={e => e.target.style.borderColor = 'var(--tf-input-border)'}
              />
            </div>
            {error && <p className="text-xs font-mono" style={{ color: '#F87171' }}>{error}</p>}
            <button type="submit" disabled={loading} className="btn-gold w-full rounded-xl py-3.5 text-sm font-semibold">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--tf-subtle)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium transition-colors" style={{ color: '#C9A84C' }}>Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
