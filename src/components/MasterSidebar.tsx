'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LayoutDashboard, Eye, Users, TrendingUp, Banknote, Radio, Settings, Camera, Brain, Monitor, BookOpen, Video } from 'lucide-react'
import type { Profile } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',    href: '/dashboard/master' },
  { icon: Monitor,         label: 'MT Dashboard', href: '/dashboard/master/mt' },
  { icon: Brain,           label: 'Strategy',     href: '/dashboard/master/strategy' },
  { icon: Video,           label: 'Live',         href: '/dashboard/master/live' },
  { icon: Radio,           label: 'Community',    href: '/dashboard/master/community' },
  { icon: BookOpen,        label: 'Courses',      href: '/dashboard/master/courses' },
  { icon: Eye,             label: 'Gig Profile',  href: '/dashboard/master/gig' },
  { icon: Users,           label: 'Followers',    href: '/dashboard/master/followers' },
  { icon: TrendingUp,      label: 'My Trades',    href: '/dashboard/master/trades' },
  { icon: Banknote,        label: 'Earnings',     href: '/dashboard/master/earnings' },
  { icon: Settings,        label: 'Settings',     href: '/dashboard/master/settings' },
]

interface Props {
  profile: Profile | null
  onAvatarChange?: (url: string) => void
}

export function MasterSidebar({ profile, onAvatarChange }: Props) {
  const pathname = usePathname()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const initials = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'

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
    <aside className="w-64 hidden md:flex flex-col p-6 gap-6 shrink-0 tf-sidebar">
      <Link href="/" className="flex items-center gap-2">
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14.5" stroke="#C9A84C" strokeWidth="1"/><path d="M22 9 A 11 11 0 1 0 22 23 A 8 8 0 1 1 22 9 Z" fill="#C9A84C"/><path d="M11 21 L21 11 M16 11 H21 V16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span style={{ fontFamily: SYS, fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.02em' }}>Trade<span style={{ color: '#C9A84C' }}>Flow</span></span>
      </Link>

      <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.2)' }}>
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        <button type="button" onClick={() => avatarInputRef.current?.click()}
          className="relative w-14 h-14 rounded-full mx-auto mb-3 block overflow-hidden group"
          style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)' }} title="Change photo">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
            : <span className="w-full h-full grid place-items-center font-bold text-xl" style={{ color: '#1F2329', fontFamily: SYS }}>{initials}</span>
          }
          <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.5)' }}>
            {uploading ? <span className="text-white text-[10px] font-mono">…</span> : <Camera size={16} color="white" />}
          </div>
        </button>
        <div className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>{profile?.full_name ?? '—'}</div>
        <div className="text-xs mt-0.5" style={{ color: '#C9A84C' }}>Master Trader ✓</div>
        {profile?.city && <div className="text-xs mt-1" style={{ color: 'var(--tf-subtle)' }}>{profile.city}</div>}
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = pathname === href
          return (
            <Link key={label} href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{ background: active ? 'rgba(201,168,76,.12)' : 'transparent', color: active ? '#C9A84C' : 'var(--tf-muted)', border: active ? '1px solid rgba(201,168,76,.2)' : '1px solid transparent' }}>
              <Icon size={16} strokeWidth={1.7} /><span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="flex items-center gap-2">
        <Link href="/marketplace" className="btn-outline rounded-xl py-2.5 px-4 text-sm font-medium text-center flex-1">View My Gig →</Link>
        <ThemeToggle />
      </div>
    </aside>
  )
}
