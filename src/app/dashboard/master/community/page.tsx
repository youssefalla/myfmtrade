'use client'

import { useEffect, useRef, useState } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import type { Profile } from '@/types/database'
import { Send } from 'lucide-react'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

interface Message {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: {
    full_name: string | null
    avatar_url: string | null
    role: string | null
  } | null
}

function roleBadge(role: string | null) {
  if (role === 'coach') return { label: 'Coach', color: '#A78BFA', bg: 'rgba(167,139,250,.12)' }
  if (role === 'master') return { label: 'Master', color: '#C9A84C', bg: 'rgba(201,168,76,.12)' }
  return { label: 'Member', color: 'var(--tf-subtle)', bg: 'transparent' }
}

export default function CommunityPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUserId(user.id)

      const [pRes, mRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('community_messages')
          .select('*, profiles(full_name, avatar_url, role)')
          .order('created_at', { ascending: true })
          .limit(100),
      ])

      setProfile(pRes.data)
      setMessages((mRes.data ?? []) as Message[])
      setLoading(false)

      // Realtime subscription
      const channel = supabase
        .channel('community')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'community_messages',
        }, async (payload) => {
          const { data } = await supabase
            .from('community_messages')
            .select('*, profiles(full_name, avatar_url, role)')
            .eq('id', payload.new.id)
            .single()
          if (data) setMessages(prev => [...prev, data as Message])
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    load()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.from('community_messages').insert({ content, user_id: userId })
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function timeLabel(iso: string) {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center tf-page">
      <div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div>
    </div>
  )

  return (
    <div className="min-h-screen flex tf-page" style={{ fontFamily: SYS }}>
      <MasterSidebar profile={profile} onAvatarChange={url => setProfile(p => p ? { ...p, avatar_url: url } : p)} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 shrink-0" style={{ borderBottom: '1px solid var(--tf-border)' }}>
          <div className="flex items-center gap-3">
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.02em' }}>Community</h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--tf-subtle)' }}>Masters · Coach · Private room</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full"
              style={{ background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.2)', color: '#4ADE80' }}>
              <span className="live-dot" />
              Live
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <div className="text-3xl mb-3">💬</div>
              <p className="text-sm" style={{ color: 'var(--tf-subtle)' }}>No messages yet. Start the conversation.</p>
            </div>
          )}
          {messages.map((msg, i) => {
            const isMe = msg.user_id === userId
            const showAvatar = i === 0 || messages[i - 1].user_id !== msg.user_id
            const badge = roleBadge(msg.profiles?.role ?? null)
            const initials = msg.profiles?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'

            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className="shrink-0 w-8 h-8">
                  {showAvatar ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden grid place-items-center text-xs font-bold"
                      style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)', color: '#1F2329' }}>
                      {msg.profiles?.avatar_url
                        ? <img src={msg.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        : initials}
                    </div>
                  ) : <div className="w-8 h-8" />}
                </div>

                {/* Bubble */}
                <div className={`max-w-sm ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {showAvatar && (
                    <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-semibold" style={{ color: 'var(--tf-text)' }}>
                        {isMe ? 'You' : msg.profiles?.full_name ?? 'Unknown'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                        style={{ background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--tf-subtle)' }}>{timeLabel(msg.created_at)}</span>
                    </div>
                  )}
                  <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                    style={{
                      background: isMe ? 'rgba(201,168,76,.15)' : 'var(--tf-card-inner)',
                      border: isMe ? '1px solid rgba(201,168,76,.25)' : '1px solid var(--tf-border)',
                      color: 'var(--tf-text)',
                      borderBottomRightRadius: isMe ? 4 : undefined,
                      borderBottomLeftRadius: !isMe ? 4 : undefined,
                    }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--tf-border)' }}>
          <div className="flex gap-3 items-center max-w-3xl mx-auto">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Message the community…"
              className="flex-1 rounded-xl px-4 py-3 text-sm outline-none tf-input"
            />
            <button onClick={sendMessage} disabled={!input.trim() || sending}
              className="w-11 h-11 rounded-xl grid place-items-center shrink-0 transition-all"
              style={{
                background: input.trim() ? 'linear-gradient(135deg,#E0C26A,#C9A84C)' : 'var(--tf-card-inner)',
                border: '1px solid var(--tf-border)',
              }}>
              <Send size={16} color={input.trim() ? '#1F2329' : 'var(--tf-muted)'} />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
