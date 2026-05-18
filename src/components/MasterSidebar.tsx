'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { TrendingUp, Radio, Settings, Camera, Brain, Monitor, Video, BarChart2 } from 'lucide-react'
import type { Profile } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

const navSections = [
  {
    label: 'Overview',
    items: [
      { icon: Monitor,    label: 'MT Dashboard', href: '/dashboard/master/mt' },
    ],
  },
  {
    label: 'Trading',
    items: [
      { icon: BarChart2,  label: 'Live Chart',   href: '/dashboard/master/chart' },
      { icon: Brain,      label: 'Strategy',     href: '/dashboard/master/strategy' },
      { icon: TrendingUp, label: 'My Trades',    href: '/dashboard/master/trades' },
    ],
  },
  {
    label: 'Community',
    items: [
      { icon: Video,      label: 'Live',         href: '/dashboard/master/live' },
      { icon: Radio,      label: 'Community',    href: '/dashboard/master/community' },
    ],
  },
  {
    label: 'Account',
    items: [
      { icon: Settings,   label: 'Settings',     href: '/dashboard/master/settings' },
    ],
  },
]

interface Props {
  profile: Profile | null
  onAvatarChange?: (url: string) => void
}

export function MasterSidebar({ profile, onAvatarChange }: Props) {
  const pathname = usePathname()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Trader'
  const initials = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      onAvatarChange?.(publicUrl)
    } finally {
      setUploading(false)
    }
  }

  return (
    <aside className="w-64 hidden md:flex flex-col shrink-0 tf-sidebar" style={{ fontFamily: SYS }}>

      {/* Logo */}
      <div className="px-6 pt-6 pb-4 flex items-center gap-2">
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14.5" stroke="#C9A84C" strokeWidth="1"/>
          <path d="M22 9 A 11 11 0 1 0 22 23 A 8 8 0 1 1 22 9 Z" fill="#C9A84C"/>
          <path d="M11 21 L21 11 M16 11 H21 V16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.02em', fontSize: '1rem' }}>
          Trade<span style={{ color: '#C9A84C' }}>Flow</span>
        </span>
      </div>

      {/* Welcome */}
      <div className="px-6 pb-5">
        <p className="text-xs mb-1" style={{ color: 'var(--tf-subtle)' }}>Welcome back,</p>
        <h2 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--tf-text)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>{firstName}</h2>
        <p className="text-xs mt-1.5 font-mono" style={{ color: '#C9A84C' }}>Master Trader ✓</p>
        <div className="mt-3" style={{ height: '1px', background: 'var(--tf-border)' }} />
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-4">
        {navSections.map(section => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1 px-2" style={{ color: 'var(--tf-subtle)' }}>
              {section.label}
            </p>
            {section.items.map(({ icon: Icon, label, href }) => {
              const active = pathname === href
              return (
                <Link key={label} href={href}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all mb-0.5"
                  style={{
                    background: active ? 'rgba(201,168,76,.12)' : 'transparent',
                    color: active ? '#C9A84C' : 'var(--tf-muted)',
                    border: active ? '1px solid rgba(201,168,76,.18)' : '1px solid transparent',
                  }}>
                  <div className="flex items-center gap-3">
                    <Icon size={16} strokeWidth={1.7} />
                    <span>{label}</span>
                  </div>
                  {active && (
                    <div className="w-1 h-4 rounded-full" style={{ background: '#C9A84C' }} />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom — avatar + name + theme */}
      <div className="px-4 py-5" style={{ borderTop: '1px solid var(--tf-border)' }}>
        <div className="flex items-center gap-3">
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          <button type="button" onClick={() => avatarInputRef.current?.click()}
            className="relative w-9 h-9 shrink-0 rounded-full overflow-hidden group"
            style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)' }} title="Change photo">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={profile.full_name ?? ''} className="w-full h-full object-cover" />
              : <span className="w-full h-full grid place-items-center font-bold text-sm" style={{ color: '#1F2329' }}>{initials}</span>
            }
            <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.5)' }}>
              {uploading ? <span className="text-white text-[10px] font-mono">…</span> : <Camera size={13} color="white" />}
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--tf-text)' }}>{profile?.full_name ?? '—'}</p>
            <p className="text-[10px] font-mono" style={{ color: 'var(--tf-subtle)' }}>{today}</p>
          </div>
          <ThemeToggle />
        </div>
      </div>

    </aside>
  )
}
