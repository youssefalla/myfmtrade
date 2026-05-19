'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { TrendingUp, Settings, Camera, Brain, Monitor, Video, BarChart2, MessageCircle, ClockArrowUp } from 'lucide-react'
import type { Profile } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'
const COMMUNITY_HREF = '/dashboard/master/community'

let _audioCtx: AudioContext | null = null
function getAudioCtx(): AudioContext {
  if (!_audioCtx) _audioCtx = new AudioContext()
  return _audioCtx
}
// Unlock audio context on first user interaction
if (typeof window !== 'undefined') {
  const unlock = () => { try { getAudioCtx().resume() } catch {} }
  window.addEventListener('click', unlock, { once: true })
  window.addEventListener('keydown', unlock, { once: true })
}

function playPop() {
  try {
    const ctx = getAudioCtx()
    const trigger = () => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.12)
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.15)
    }
    if (ctx.state === 'suspended') ctx.resume().then(trigger)
    else trigger()
  } catch {}
}

const navItems = [
  { icon: Monitor,        label: 'MT Dashboard',      href: '/dashboard/master/mt' },
  { icon: BarChart2,      label: 'Live Chart',        href: '/dashboard/master/chart' },
  { icon: Brain,          label: 'Strategy',          href: '/dashboard/master/strategy' },
  { icon: ClockArrowUp,   label: 'Strategy History',  href: '/dashboard/master/history' },
  { icon: Video,          label: 'Live',              href: '/dashboard/master/live' },
  { icon: MessageCircle,  label: 'Community',         href: COMMUNITY_HREF },
  { icon: TrendingUp,     label: 'My Trades',         href: '/dashboard/master/trades' },
  { icon: Settings,       label: 'Settings',          href: '/dashboard/master/settings' },
]

interface Props {
  profile: Profile | null
  onAvatarChange?: (url: string) => void
}

export function MasterSidebar({ profile, onAvatarChange }: Props) {
  const pathname = usePathname()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [unread, setUnread] = useState(0)
  const initials = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  // Reset unread when on community page, otherwise count new messages
  useEffect(() => {
    if (pathname === COMMUNITY_HREF) {
      setUnread(0)
      localStorage.setItem('community_last_seen', new Date().toISOString())
      return
    }

    let cleanup: (() => void) | undefined

    async function init() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const lastSeen = localStorage.getItem('community_last_seen') ?? new Date(0).toISOString()

      // Count messages since last visit
      const { count } = await supabase
        .from('community_messages')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', lastSeen)

      setUnread(count ?? 0)

      // Subscribe to new messages
      const channel = supabase
        .channel('sidebar-community')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages' }, () => {
          setUnread(n => n + 1)
          playPop()
        })
        .subscribe()

      cleanup = () => { supabase.removeChannel(channel) }
    }

    init()
    return () => { cleanup?.() }
  }, [pathname])

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
    <aside className="w-64 hidden md:flex flex-col p-6 gap-6 shrink-0 tf-sidebar" style={{
      background: 'var(--tf-sidebar-bg)',
      backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(201,168,76,.14) 0%, transparent 100%)',
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflowY: 'auto',
    }}>
      <Link href="/" className="flex items-center gap-2">
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14.5" stroke="#C9A84C" strokeWidth="1"/><path d="M22 9 A 11 11 0 1 0 22 23 A 8 8 0 1 1 22 9 Z" fill="#C9A84C"/><path d="M11 21 L21 11 M16 11 H21 V16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span style={{ fontFamily: SYS, fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.02em' }}>Trade<span style={{ color: '#C9A84C' }}>Flow</span></span>
      </Link>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = pathname === href
          const isCommunity = href === COMMUNITY_HREF
          return (
            <Link key={label} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{
                background: active ? 'rgba(30,24,12,.55)' : 'transparent',
                backdropFilter: active ? 'blur(16px)' : undefined,
                WebkitBackdropFilter: active ? 'blur(16px)' : undefined,
                color: active ? '#C9A84C' : 'var(--tf-muted)',
                border: active ? '1px solid rgba(201,168,76,.22)' : '1px solid transparent',
                boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,.08), inset 1px 0 0 rgba(255,255,255,.04)' : undefined,
              }}>
              <div className="relative shrink-0">
                <Icon size={16} strokeWidth={1.7} />
                {isCommunity && unread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ background: '#EF4444', color: '#fff', padding: '0 3px', lineHeight: 1 }}>
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </div>
              <span className="flex-1">{label}</span>
              {active && <div className="w-[3px] h-4 rounded-full" style={{ background: 'linear-gradient(180deg, #E0C26A, #C9A84C)' }} />}
            </Link>
          )
        })}
      </nav>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          <button type="button" onClick={() => avatarInputRef.current?.click()}
            className="relative w-10 h-10 shrink-0 rounded-full overflow-hidden group"
            style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)' }} title="Change photo">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={profile.full_name ?? ''} className="w-full h-full object-cover" />
              : <span className="w-full h-full grid place-items-center font-bold text-sm" style={{ color: '#1F2329', fontFamily: SYS }}>{initials}</span>
            }
            <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.5)' }}>
              {uploading ? <span className="text-white text-[10px] font-mono">…</span> : <Camera size={13} color="white" />}
            </div>
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--tf-text)', fontFamily: SYS }}>{profile?.full_name ?? '—'}</span>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  )
}
