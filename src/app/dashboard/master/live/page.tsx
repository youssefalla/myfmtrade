'use client'

import { useEffect, useRef, useState } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import type { Profile } from '@/types/database'
import { Radio, Send, StopCircle, Play } from 'lucide-react'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

interface LiveSession {
  id: string
  master_id: string
  title: string
  description: string | null
  stream_url: string | null
  is_live: boolean
  started_at: string | null
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

interface LiveMessage {
  id: string
  session_id: string
  user_id: string
  content: string
  created_at: string
  profiles: { full_name: string | null; avatar_url: string | null; role: string | null } | null
}

function youtubeEmbedUrl(url: string) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1`
  const twitchMatch = url.match(/twitch\.tv\/([^/?]+)/)
  if (twitchMatch) return `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}`
  return url
}

export default function LivePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // All live sessions
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null)

  // My live session
  const [mySession, setMySession] = useState<LiveSession | null>(null)
  const [goingLive, setGoingLive] = useState(false)
  const [liveForm, setLiveForm] = useState({ title: '', description: '', stream_url: '' })
  const [showForm, setShowForm] = useState(false)

  // Live chat
  const [messages, setMessages] = useState<LiveMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUserId(user.id)

      const [pRes, sessRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('live_sessions')
          .select('*, profiles(full_name, avatar_url)')
          .eq('is_live', true)
          .order('started_at', { ascending: false }),
      ])

      setProfile(pRes.data)
      const liveSessions = (sessRes.data ?? []) as LiveSession[]
      setSessions(liveSessions)

      const mine = liveSessions.find(s => s.master_id === user.id)
      if (mine) { setMySession(mine); setActiveSession(mine) }
      else if (liveSessions.length > 0) setActiveSession(liveSessions[0])

      setLoading(false)

      // Realtime: sessions
      supabase.channel('live-sessions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, async () => {
          const { data } = await supabase.from('live_sessions')
            .select('*, profiles(full_name, avatar_url)')
            .eq('is_live', true)
            .order('started_at', { ascending: false })
          const updated = (data ?? []) as LiveSession[]
          setSessions(updated)
          const myUpdated = updated.find(s => s.master_id === user.id)
          setMySession(myUpdated ?? null)
        })
        .subscribe()
    }
    load()
  }, [])

  // Load chat when active session changes
  useEffect(() => {
    if (!activeSession) return
    let cleanup: (() => void) | undefined

    async function loadChat() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { data } = await supabase
        .from('live_messages')
        .select('*, profiles(full_name, avatar_url, role)')
        .eq('session_id', activeSession!.id)
        .order('created_at', { ascending: true })
        .limit(200)

      setMessages((data ?? []) as LiveMessage[])

      const channel = supabase.channel(`live-chat-${activeSession!.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'live_messages',
          filter: `session_id=eq.${activeSession!.id}`,
        }, async (payload) => {
          const { data: msg } = await supabase
            .from('live_messages')
            .select('*, profiles(full_name, avatar_url, role)')
            .eq('id', payload.new.id)
            .single()
          if (msg) setMessages(prev => [...prev, msg as LiveMessage])
        })
        .subscribe()

      cleanup = () => supabase.removeChannel(channel)
    }

    loadChat()
    return () => cleanup?.()
  }, [activeSession?.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function startLive() {
    if (!liveForm.title.trim()) return
    setGoingLive(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase.from('live_sessions').insert({
        master_id: userId,
        title: liveForm.title,
        description: liveForm.description || null,
        stream_url: liveForm.stream_url || null,
        is_live: true,
        started_at: new Date().toISOString(),
      }).select('*, profiles(full_name, avatar_url)').single()
      if (data) { setMySession(data as LiveSession); setActiveSession(data as LiveSession); setShowForm(false) }
    } finally { setGoingLive(false) }
  }

  async function endLive() {
    if (!mySession) return
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.from('live_sessions').update({ is_live: false, ended_at: new Date().toISOString() }).eq('id', mySession.id)
    setMySession(null)
    setSessions(prev => prev.filter(s => s.id !== mySession.id))
    if (activeSession?.id === mySession.id) setActiveSession(sessions.find(s => s.id !== mySession.id) ?? null)
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || !activeSession || !userId) return
    const content = chatInput.trim()
    setChatInput('')
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.from('live_messages').insert({ session_id: activeSession.id, user_id: userId, content })
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
        <div className="px-6 py-5 shrink-0 flex items-center gap-4" style={{ borderBottom: '1px solid var(--tf-border)' }}>
          <div className="flex-1">
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.02em' }}>Live</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tf-subtle)' }}>{sessions.length} session{sessions.length !== 1 ? 's' : ''} live now</p>
          </div>

          {mySession ? (
            <button onClick={endLive}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(248,113,113,.12)', border: '1px solid rgba(248,113,113,.3)', color: '#F87171' }}>
              <StopCircle size={15} /> End Live
            </button>
          ) : (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold btn-gold">
              <Radio size={15} /> Go Live
            </button>
          )}
        </div>

        {/* Go Live Form */}
        {showForm && !mySession && (
          <div className="px-6 py-5 shrink-0" style={{ borderBottom: '1px solid var(--tf-border)', background: 'rgba(201,168,76,.04)' }}>
            <div className="max-w-lg space-y-3">
              <input value={liveForm.title} onChange={e => setLiveForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Session title — e.g. XAUUSD Analysis · London Open"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input" />
              <input value={liveForm.description} onChange={e => setLiveForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Short description (optional)"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input" />
              <input value={liveForm.stream_url} onChange={e => setLiveForm(f => ({ ...f, stream_url: e.target.value }))}
                placeholder="YouTube / Twitch URL (optional — leave empty for text-only session)"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input" />
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)} className="btn-outline rounded-xl px-4 py-2.5 text-sm flex-1">Cancel</button>
                <button onClick={startLive} disabled={!liveForm.title.trim() || goingLive}
                  className="btn-gold rounded-xl py-2.5 text-sm font-semibold flex-1">
                  {goingLive ? 'Starting…' : '🔴 Start Live'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* Sessions list */}
          {sessions.length > 1 && (
            <div className="w-56 shrink-0 overflow-y-auto p-3 space-y-2" style={{ borderRight: '1px solid var(--tf-border)' }}>
              {sessions.map(s => (
                <button key={s.id} onClick={() => setActiveSession(s)}
                  className="w-full text-left rounded-xl p-3 transition-all"
                  style={{
                    background: activeSession?.id === s.id ? 'rgba(201,168,76,.1)' : 'var(--tf-card-inner)',
                    border: activeSession?.id === s.id ? '1px solid rgba(201,168,76,.3)' : '1px solid var(--tf-border)',
                  }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="live-dot" />
                    <span className="text-[10px] font-mono" style={{ color: '#F87171' }}>LIVE</span>
                  </div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--tf-text)' }}>{s.title}</div>
                  <div className="text-[10px] mt-1" style={{ color: 'var(--tf-subtle)' }}>{s.profiles?.full_name}</div>
                </button>
              ))}
            </div>
          )}

          {/* Main content */}
          {activeSession ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Stream + info */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Stream embed */}
                {activeSession.stream_url ? (
                  <div className="shrink-0" style={{ aspectRatio: '16/9', background: '#000' }}>
                    <iframe
                      src={youtubeEmbedUrl(activeSession.stream_url)}
                      className="w-full h-full"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="shrink-0 flex flex-col items-center justify-center py-16"
                    style={{ background: 'radial-gradient(circle at 50% 50%, rgba(201,168,76,.06) 0%, transparent 70%)' }}>
                    <div className="w-20 h-20 rounded-full grid place-items-center mb-4"
                      style={{ background: 'rgba(248,113,113,.1)', border: '2px solid rgba(248,113,113,.3)' }}>
                      <Radio size={32} color="#F87171" />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="live-dot" />
                      <span className="text-sm font-mono font-semibold" style={{ color: '#F87171' }}>LIVE</span>
                    </div>
                    <div className="text-lg font-bold mb-2" style={{ color: 'var(--tf-text)', fontFamily: SYS }}>{activeSession.title}</div>
                    {activeSession.description && (
                      <div className="text-sm text-center max-w-xs" style={{ color: 'var(--tf-subtle)' }}>{activeSession.description}</div>
                    )}
                    <div className="text-xs mt-3" style={{ color: 'var(--tf-subtle)' }}>by {activeSession.profiles?.full_name}</div>
                  </div>
                )}

                {/* Session info */}
                <div className="px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--tf-border)' }}>
                  <div className="flex items-center gap-2">
                    <span className="live-dot" />
                    <span className="text-xs font-mono" style={{ color: '#F87171' }}>LIVE</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>{activeSession.title}</span>
                    <span className="text-xs" style={{ color: 'var(--tf-subtle)' }}>· {activeSession.profiles?.full_name}</span>
                  </div>
                  {activeSession.description && (
                    <p className="text-xs mt-1" style={{ color: 'var(--tf-subtle)' }}>{activeSession.description}</p>
                  )}
                </div>
              </div>

              {/* Live Chat */}
              <div className="w-72 shrink-0 flex flex-col" style={{ borderLeft: '1px solid var(--tf-border)' }}>
                <div className="px-4 py-3 text-xs font-semibold shrink-0" style={{ color: 'var(--tf-text)', borderBottom: '1px solid var(--tf-border)' }}>
                  Live Chat
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                  {messages.map(msg => {
                    const initials = msg.profiles?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'
                    const isMe = msg.user_id === userId
                    return (
                      <div key={msg.id} className="flex gap-2">
                        <div className="w-6 h-6 rounded-full shrink-0 overflow-hidden grid place-items-center text-[10px] font-bold"
                          style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)', color: '#1F2329' }}>
                          {msg.profiles?.avatar_url
                            ? <img src={msg.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                            : initials}
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold mr-1" style={{ color: isMe ? '#C9A84C' : 'var(--tf-muted)' }}>
                            {isMe ? 'You' : msg.profiles?.full_name}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--tf-text)' }}>{msg.content}</span>
                        </div>
                      </div>
                    )
                  })}
                  {messages.length === 0 && (
                    <p className="text-xs text-center pt-8" style={{ color: 'var(--tf-subtle)' }}>Be the first to chat…</p>
                  )}
                  <div ref={bottomRef} />
                </div>
                <div className="px-3 py-3 shrink-0 flex gap-2" style={{ borderTop: '1px solid var(--tf-border)' }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendChatMessage() } }}
                    placeholder="Chat…"
                    className="flex-1 rounded-xl px-3 py-2 text-xs outline-none tf-input" />
                  <button onClick={sendChatMessage} disabled={!chatInput.trim()}
                    className="w-8 h-8 rounded-xl grid place-items-center shrink-0"
                    style={{ background: chatInput.trim() ? 'linear-gradient(135deg,#E0C26A,#C9A84C)' : 'var(--tf-card-inner)', border: '1px solid var(--tf-border)' }}>
                    <Send size={13} color={chatInput.trim() ? '#1F2329' : 'var(--tf-muted)'} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-5xl mb-5">📡</div>
              <p className="text-base font-semibold mb-2" style={{ color: 'var(--tf-text)' }}>No live sessions right now</p>
              <p className="text-sm mb-6" style={{ color: 'var(--tf-subtle)' }}>Be the first to go live and share your analysis.</p>
              <button onClick={() => setShowForm(true)} className="btn-gold rounded-xl px-6 py-3 text-sm font-semibold flex items-center gap-2">
                <Play size={15} /> Start a Session
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
