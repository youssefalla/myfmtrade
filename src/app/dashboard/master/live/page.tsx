'use client'

import { useEffect, useRef, useState } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import type { Profile } from '@/types/database'
import { Calendar, Radio, Send, StopCircle, Plus, Clock, ExternalLink } from 'lucide-react'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

interface LiveSession {
  id: string
  coach_id: string
  title: string
  description: string | null
  stream_url: string | null
  is_live: boolean
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
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
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`
  const tw = url.match(/twitch\.tv\/([^/?]+)/)
  if (tw) return `https://player.twitch.tv/?channel=${tw[1]}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}`
  return url
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function LivePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<LiveSession[]>([])
  const [watching, setWatching] = useState<LiveSession | null>(null)

  // Coach controls
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({ title: '', description: '', stream_url: '', scheduled_at: '' })
  const [saving, setSaving] = useState(false)
  const [myLiveSession, setMyLiveSession] = useState<LiveSession | null>(null)
  const [startingLive, setStartingLive] = useState(false)

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
          .order('scheduled_at', { ascending: true }),
      ])

      setProfile(pRes.data)
      const role = pRes.data?.role ?? 'master'
      setUserRole(role)

      const all = (sessRes.data ?? []) as LiveSession[]
      setSessions(all)
      const live = all.filter(s => s.is_live)
      const upcoming = all.filter(s => !s.is_live && !s.ended_at && s.scheduled_at && new Date(s.scheduled_at) > new Date())
      setLiveSessions(live)
      setUpcomingSessions(upcoming)

      if (live.length > 0) setWatching(live[0])

      if (role === 'coach') {
        const mine = live.find(s => s.coach_id === user.id)
        if (mine) setMyLiveSession(mine)
      }

      setLoading(false)

      // Realtime
      supabase.channel('live-sessions-watch')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, async () => {
          const { data } = await supabase.from('live_sessions')
            .select('*, profiles(full_name, avatar_url)')
            .order('scheduled_at', { ascending: true })
          const updated = (data ?? []) as LiveSession[]
          setSessions(updated)
          const liveNow = updated.filter(s => s.is_live)
          const soon = updated.filter(s => !s.is_live && !s.ended_at && s.scheduled_at && new Date(s.scheduled_at) > new Date())
          setLiveSessions(liveNow)
          setUpcomingSessions(soon)
          if (role === 'coach') {
            const mine = liveNow.find(s => s.coach_id === user.id)
            setMyLiveSession(mine ?? null)
          }
        })
        .subscribe()
    }
    load()
  }, [])

  useEffect(() => {
    if (!watching) return
    let cleanup: (() => void) | undefined
    async function loadChat() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase.from('live_messages')
        .select('*, profiles(full_name, avatar_url, role)')
        .eq('session_id', watching!.id)
        .order('created_at', { ascending: true })
        .limit(200)
      setMessages((data ?? []) as LiveMessage[])

      const ch = supabase.channel(`live-chat-${watching!.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_messages', filter: `session_id=eq.${watching!.id}` }, async (payload) => {
          const { data: msg } = await supabase.from('live_messages').select('*, profiles(full_name, avatar_url, role)').eq('id', payload.new.id).single()
          if (msg) setMessages(prev => [...prev, msg as LiveMessage])
        })
        .subscribe()
      cleanup = () => supabase.removeChannel(ch)
    }
    loadChat()
    return () => cleanup?.()
  }, [watching?.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function scheduleSession() {
    if (!scheduleForm.title.trim()) return
    setSaving(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase.from('live_sessions').insert({
        coach_id: userId,
        title: scheduleForm.title,
        description: scheduleForm.description || null,
        stream_url: scheduleForm.stream_url || null,
        scheduled_at: scheduleForm.scheduled_at ? new Date(scheduleForm.scheduled_at).toISOString() : null,
        is_live: false,
      }).select('*, profiles(full_name, avatar_url)').single()
      if (data) {
        setUpcomingSessions(prev => [...prev, data as LiveSession].sort((a, b) => new Date(a.scheduled_at ?? 0).getTime() - new Date(b.scheduled_at ?? 0).getTime()))
        setScheduleForm({ title: '', description: '', stream_url: '', scheduled_at: '' })
        setShowScheduleForm(false)
      }
    } finally { setSaving(false) }
  }

  async function goLive(session: LiveSession) {
    setStartingLive(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.from('live_sessions').update({ is_live: true, started_at: new Date().toISOString() }).eq('id', session.id)

      // Send email alert to all masters
      await fetch('/api/alerts/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, title: session.title, coachName: profile?.full_name }),
      })

      setMyLiveSession({ ...session, is_live: true })
      setWatching({ ...session, is_live: true })
    } finally { setStartingLive(false) }
  }

  async function endLive() {
    if (!myLiveSession) return
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.from('live_sessions').update({ is_live: false, ended_at: new Date().toISOString() }).eq('id', myLiveSession.id)
    setMyLiveSession(null)
    if (watching?.id === myLiveSession.id) setWatching(null)
  }

  async function sendChat() {
    if (!chatInput.trim() || !watching || !userId) return
    const content = chatInput.trim()
    setChatInput('')
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.from('live_messages').insert({ session_id: watching.id, user_id: userId, content })
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center tf-page">
      <div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div>
    </div>
  )

  const isCoach = userRole === 'coach'

  return (
    <div className="min-h-screen flex tf-page" style={{ fontFamily: SYS }}>
      <MasterSidebar profile={profile} onAvatarChange={url => setProfile(p => p ? { ...p, avatar_url: url } : p)} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 shrink-0" style={{ borderBottom: '1px solid var(--tf-border)' }}>
          <div className="text-center mb-3">
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.02em' }}>Live Sessions</h1>
            <p className="text-xs mt-1" style={{ color: 'var(--tf-subtle)' }}>Coach live analysis · You get an email when it starts</p>
            <div className="mt-3" style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)', boxShadow: '0 0 12px rgba(201,168,76,.45)' }} />
          </div>
          {isCoach && (
            <div className="flex items-center justify-center gap-2 mt-2">
              {myLiveSession ? (
                <button onClick={endLive}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(248,113,113,.12)', border: '1px solid rgba(248,113,113,.3)', color: '#F87171' }}>
                  <StopCircle size={14} /> End Live
                </button>
              ) : null}
              <button onClick={() => setShowScheduleForm(v => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold btn-gold">
                <Plus size={14} /> Schedule Session
              </button>
            </div>
          )}

        {/* Coach: schedule form */}
        {isCoach && showScheduleForm && (
          <div className="px-6 py-5 shrink-0 space-y-3" style={{ borderBottom: '1px solid var(--tf-border)', background: 'rgba(201,168,76,.04)' }}>
            <div className="max-w-xl grid grid-cols-2 gap-3">
              <input value={scheduleForm.title} onChange={e => setScheduleForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Session title" className="col-span-2 rounded-xl px-4 py-3 text-sm outline-none tf-input" />
              <input value={scheduleForm.description} onChange={e => setScheduleForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Description (optional)" className="col-span-2 rounded-xl px-4 py-3 text-sm outline-none tf-input" />
              <input value={scheduleForm.stream_url} onChange={e => setScheduleForm(f => ({ ...f, stream_url: e.target.value }))}
                placeholder="YouTube / Twitch URL (optional)" className="rounded-xl px-4 py-3 text-sm outline-none tf-input" />
              <input type="datetime-local" value={scheduleForm.scheduled_at} onChange={e => setScheduleForm(f => ({ ...f, scheduled_at: e.target.value }))}
                className="rounded-xl px-4 py-3 text-sm outline-none tf-input" />
            </div>
            <div className="flex gap-2 max-w-xl">
              <button onClick={() => setShowScheduleForm(false)} className="btn-outline rounded-xl px-5 py-2.5 text-sm flex-1">Cancel</button>
              <button onClick={scheduleSession} disabled={!scheduleForm.title.trim() || saving}
                className="btn-gold rounded-xl py-2.5 text-sm font-semibold flex-1">
                {saving ? 'Saving…' : 'Schedule →'}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">

          {/* LEFT — calendar + sessions list */}
          <div className="w-72 shrink-0 overflow-y-auto p-4 space-y-6" style={{ borderRight: '1px solid var(--tf-border)' }}>

            {/* Live now */}
            {liveSessions.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest mb-3 font-mono flex items-center gap-2" style={{ color: '#F87171' }}>
                  <span className="live-dot" /> Live Now
                </div>
                <div className="space-y-2">
                  {liveSessions.map(s => (
                    <button key={s.id} onClick={() => setWatching(s)}
                      className="w-full text-left rounded-xl p-3 transition-all"
                      style={{
                        background: watching?.id === s.id ? 'rgba(248,113,113,.1)' : 'var(--tf-card-inner)',
                        border: watching?.id === s.id ? '1px solid rgba(248,113,113,.35)' : '1px solid var(--tf-border)',
                      }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: 'var(--tf-text)' }}>{s.title}</div>
                      <div className="text-[10px]" style={{ color: 'var(--tf-subtle)' }}>{s.profiles?.full_name}</div>
                      {isCoach && s.coach_id === userId && (
                        <div className="mt-2 flex gap-1.5">
                          {!s.is_live ? (
                            <button onClick={e => { e.stopPropagation(); goLive(s) }} disabled={startingLive}
                              className="text-[10px] font-mono px-2.5 py-1 rounded-full"
                              style={{ background: 'rgba(248,113,113,.15)', color: '#F87171', border: '1px solid rgba(248,113,113,.3)' }}>
                              {startingLive ? '…' : '🔴 Go Live'}
                            </button>
                          ) : null}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming */}
            <div>
              <div className="text-[10px] uppercase tracking-widest mb-3 font-mono flex items-center gap-2" style={{ color: 'var(--tf-subtle)' }}>
                <Calendar size={11} /> Upcoming
              </div>
              {upcomingSessions.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--tf-subtle)' }}>No sessions scheduled yet.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingSessions.map(s => (
                    <div key={s.id} className="rounded-xl p-3"
                      style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)' }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: 'var(--tf-text)' }}>{s.title}</div>
                      {s.scheduled_at && (
                        <div className="flex items-center gap-1 text-[10px]" style={{ color: '#C9A84C' }}>
                          <Clock size={9} />
                          {formatDate(s.scheduled_at)} · {formatTime(s.scheduled_at)}
                        </div>
                      )}
                      <div className="text-[10px] mt-1" style={{ color: 'var(--tf-subtle)' }}>{s.profiles?.full_name}</div>
                      {isCoach && s.coach_id === userId && (
                        <button onClick={() => goLive(s)} disabled={startingLive}
                          className="mt-2 text-[10px] font-mono px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(248,113,113,.15)', color: '#F87171', border: '1px solid rgba(248,113,113,.3)' }}>
                          {startingLive ? '…' : '🔴 Go Live Now'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — stream + chat */}
          {watching ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Stream */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {watching.stream_url ? (
                  <div style={{ aspectRatio: '16/9', background: '#000', flexShrink: 0 }}>
                    <iframe src={youtubeEmbedUrl(watching.stream_url)}
                      className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 shrink-0"
                    style={{ background: 'radial-gradient(circle at 50% 40%, rgba(248,113,113,.06) 0%, transparent 60%)' }}>
                    <div className="w-20 h-20 rounded-full grid place-items-center mb-4"
                      style={{ background: 'rgba(248,113,113,.1)', border: '2px solid rgba(248,113,113,.25)' }}>
                      <Radio size={32} color="#F87171" />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      {watching.is_live
                        ? <><span className="live-dot" /><span className="text-sm font-mono font-semibold" style={{ color: '#F87171' }}>LIVE</span></>
                        : <span className="text-sm font-mono" style={{ color: '#C9A84C' }}>Scheduled</span>
                      }
                    </div>
                    <div className="text-xl font-bold mb-2" style={{ color: 'var(--tf-text)', fontFamily: SYS }}>{watching.title}</div>
                    {watching.description && <div className="text-sm text-center max-w-xs mb-3" style={{ color: 'var(--tf-subtle)' }}>{watching.description}</div>}
                    {watching.scheduled_at && !watching.is_live && (
                      <div className="flex items-center gap-2 text-sm" style={{ color: '#C9A84C' }}>
                        <Clock size={14} /> {formatDate(watching.scheduled_at)} at {formatTime(watching.scheduled_at)}
                      </div>
                    )}
                    {watching.stream_url && (
                      <a href={watching.stream_url} target="_blank" rel="noreferrer"
                        className="mt-4 flex items-center gap-2 text-xs px-4 py-2 rounded-full"
                        style={{ border: '1px solid var(--tf-border)', color: 'var(--tf-muted)' }}>
                        <ExternalLink size={12} /> Open stream externally
                      </a>
                    )}
                    <div className="text-xs mt-4" style={{ color: 'var(--tf-subtle)' }}>by {watching.profiles?.full_name ?? 'Coach'}</div>
                  </div>
                )}

                {/* Session info bar */}
                <div className="px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--tf-border)' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {watching.is_live
                      ? <><span className="live-dot" /><span className="text-xs font-mono" style={{ color: '#F87171' }}>LIVE</span></>
                      : <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,.2)' }}>Upcoming</span>
                    }
                    <span className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>{watching.title}</span>
                    <span className="text-xs" style={{ color: 'var(--tf-subtle)' }}>· {watching.profiles?.full_name}</span>
                    {watching.scheduled_at && !watching.is_live && (
                      <span className="text-xs ml-auto flex items-center gap-1" style={{ color: '#C9A84C' }}>
                        <Clock size={11} /> {formatDate(watching.scheduled_at)} {formatTime(watching.scheduled_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Chat */}
              <div className="w-72 shrink-0 flex flex-col" style={{ borderLeft: '1px solid var(--tf-border)' }}>
                <div className="px-4 py-3 text-xs font-semibold shrink-0" style={{ color: 'var(--tf-text)', borderBottom: '1px solid var(--tf-border)' }}>
                  Live Chat
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-xs text-center pt-10" style={{ color: 'var(--tf-subtle)' }}>No messages yet…</p>
                  )}
                  {messages.map(msg => {
                    const isMe = msg.user_id === userId
                    const initials = msg.profiles?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'
                    return (
                      <div key={msg.id} className="flex gap-2">
                        <div className="w-6 h-6 rounded-full shrink-0 overflow-hidden grid place-items-center text-[10px] font-bold"
                          style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)', color: '#1F2329' }}>
                          {msg.profiles?.avatar_url ? <img src={msg.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold mr-1" style={{ color: msg.profiles?.role === 'coach' ? '#A78BFA' : isMe ? '#C9A84C' : 'var(--tf-muted)' }}>
                            {isMe ? 'You' : msg.profiles?.full_name}
                            {msg.profiles?.role === 'coach' && <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(167,139,250,.15)', color: '#A78BFA' }}>Coach</span>}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--tf-text)' }}>{msg.content}</span>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>
                <div className="px-3 py-3 shrink-0 flex gap-2" style={{ borderTop: '1px solid var(--tf-border)' }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendChat() } }}
                    placeholder="Chat…" className="flex-1 rounded-xl px-3 py-2 text-xs outline-none tf-input" />
                  <button onClick={sendChat} disabled={!chatInput.trim()}
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
              <p className="text-base font-semibold mb-2" style={{ color: 'var(--tf-text)' }}>No live session right now</p>
              <p className="text-sm" style={{ color: 'var(--tf-subtle)' }}>You'll get an email when the coach goes live.</p>
              {upcomingSessions.length > 0 && (
                <div className="mt-6 rounded-2xl p-5 tf-card-bg" style={{ border: '1px solid rgba(201,168,76,.2)', maxWidth: 320 }}>
                  <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: '#C9A84C' }}>Next Session</div>
                  <div className="text-sm font-semibold mb-1" style={{ color: 'var(--tf-text)' }}>{upcomingSessions[0].title}</div>
                  {upcomingSessions[0].scheduled_at && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#C9A84C' }}>
                      <Clock size={13} />
                      {formatDate(upcomingSessions[0].scheduled_at)} · {formatTime(upcomingSessions[0].scheduled_at)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
