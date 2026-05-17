'use client'

import { useEffect, useState } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import type { Profile } from '@/types/database'
import { Plus, Lock, Unlock, Trash2, Play, X } from 'lucide-react'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

interface Course {
  id: string
  creator_id: string
  title: string
  description: string | null
  video_url: string | null
  thumbnail_url: string | null
  is_free: boolean
  created_at: string
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

function vimeoEmbed(url: string) {
  const match = url.match(/vimeo\.com\/(\d+)/)
  return match ? `https://player.vimeo.com/video/${match[1]}?autoplay=1&title=0&byline=0&portrait=0` : null
}

function vimeoThumb(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/)
  return match ? `https://vumbnail.com/${match[1]}.jpg` : null
}

function youtubeEmbed(url: string) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null
}

function youtubeThumb(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null
}

function getEmbed(url: string) {
  return vimeoEmbed(url) ?? youtubeEmbed(url)
}

function getThumbnail(url: string): string | null {
  return vimeoThumb(url) ?? youtubeThumb(url)
}

export default function MasterCoursesPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Form (coach only)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', video_url: '', is_free: true })
  const [formError, setFormError] = useState('')

  // Player
  const [playing, setPlaying] = useState<Course | null>(null)

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUserId(user.id)

      const [pRes, cRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('courses')
          .select('*, profiles(full_name, avatar_url)')
          .order('created_at', { ascending: false }),
      ])

      setProfile(pRes.data)
      setUserRole(pRes.data?.role ?? 'master')
      setCourses((cRes.data ?? []) as Course[])
      setLoading(false)
    }
    load()
  }, [])

  async function saveCourse() {
    if (!form.title.trim()) { setFormError('Title is required.'); return }
    setSaving(true); setFormError('')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const thumbnail = form.video_url ? getThumbnail(form.video_url) : null

      const { data, error } = await supabase.from('courses').insert({
        creator_id: userId,
        title: form.title,
        description: form.description || null,
        video_url: form.video_url || null,
        thumbnail_url: thumbnail,
        is_free: form.is_free,
      }).select('*, profiles(full_name, avatar_url)').single()

      if (error) throw error
      setCourses(prev => [data as Course, ...prev])
      setForm({ title: '', description: '', video_url: '', is_free: true })
      setShowForm(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function deleteCourse(id: string) {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.from('courses').delete().eq('id', id)
    setCourses(prev => prev.filter(c => c.id !== id))
    if (playing?.id === id) setPlaying(null)
  }

  async function toggleFree(course: Course) {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.from('courses').update({ is_free: !course.is_free }).eq('id', course.id)
    setCourses(prev => prev.map(c => c.id === course.id ? { ...c, is_free: !c.is_free } : c))
  }

  const isCoach = userRole === 'coach'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center tf-page">
      <div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div>
    </div>
  )

  return (
    <div className="min-h-screen flex tf-page" style={{ fontFamily: SYS }}>
      <MasterSidebar profile={profile} onAvatarChange={url => setProfile(p => p ? { ...p, avatar_url: url } : p)} />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }}>Courses</h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--tf-subtle)' }}>
                {isCoach ? 'Publish courses for master traders.' : 'Learn from your coach — free and premium content.'}
              </p>
            </div>
            {isCoach && (
              <button onClick={() => setShowForm(true)}
                className="btn-gold rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2">
                <Plus size={16} /> New Course
              </button>
            )}
          </div>

          {/* Coach: add course form */}
          {isCoach && showForm && (
            <div className="rounded-2xl p-6 mb-8 tf-card-bg" style={{ border: '1px solid rgba(201,168,76,.3)' }}>
              <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--tf-text)' }}>Add New Course</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. SMC Masterclass — Market Structure"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2} placeholder="What will traders learn in this course?"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none tf-input" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Vimeo URL</label>
                  <input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                    placeholder="https://vimeo.com/123456789"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input font-mono" />
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--tf-subtle)' }}>Vimeo recommended · YouTube also supported</p>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Access</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Free for all', value: true, icon: Unlock },
                      { label: 'Subscribers only', value: false, icon: Lock },
                    ].map(({ label, value, icon: Icon }) => (
                      <button key={label} onClick={() => setForm(f => ({ ...f, is_free: value }))}
                        className="rounded-xl py-3 text-sm font-medium transition-all flex items-center justify-center gap-2"
                        style={{
                          border: form.is_free === value ? '1px solid #C9A84C' : '1px solid var(--tf-border)',
                          background: form.is_free === value ? 'rgba(201,168,76,.1)' : 'transparent',
                          color: form.is_free === value ? '#C9A84C' : 'var(--tf-muted)',
                        }}>
                        <Icon size={14} />{label}
                      </button>
                    ))}
                  </div>
                </div>
                {formError && <p className="text-xs font-mono" style={{ color: '#F87171' }}>{formError}</p>}
                <div className="flex gap-3">
                  <button onClick={() => { setShowForm(false); setFormError('') }} className="btn-outline rounded-xl px-5 py-2.5 text-sm flex-1">Cancel</button>
                  <button onClick={saveCourse} disabled={saving} className="btn-gold rounded-xl py-2.5 text-sm font-semibold flex-1">
                    {saving ? 'Publishing…' : 'Publish Course →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Video player modal */}
          {playing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
              <div className="w-full max-w-4xl rounded-2xl overflow-hidden" style={{ background: '#0A0C0F', border: '1px solid var(--tf-border)' }}>
                {playing.video_url && getEmbed(playing.video_url) ? (
                  <div style={{ aspectRatio: '16/9' }}>
                    <iframe src={getEmbed(playing.video_url)!}
                      className="w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen />
                  </div>
                ) : (
                  <div className="aspect-video flex items-center justify-center">
                    <p className="text-sm" style={{ color: 'var(--tf-subtle)' }}>No video URL provided</p>
                  </div>
                )}
                <div className="p-5 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>{playing.title}</div>
                    {playing.description && <div className="text-xs mt-1" style={{ color: 'var(--tf-subtle)' }}>{playing.description}</div>}
                    <div className="text-xs mt-2" style={{ color: '#C9A84C' }}>by {playing.profiles?.full_name ?? 'Coach'}</div>
                  </div>
                  <button onClick={() => setPlaying(null)}
                    className="w-8 h-8 rounded-full grid place-items-center shrink-0"
                    style={{ border: '1px solid var(--tf-border)', color: 'var(--tf-muted)' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Courses grid */}
          {courses.length === 0 ? (
            <div className="rounded-2xl p-16 tf-card-bg text-center">
              <div className="text-5xl mb-4">🎓</div>
              <p className="text-base font-semibold mb-2" style={{ color: 'var(--tf-text)' }}>
                {isCoach ? 'No courses yet' : 'No courses available yet'}
              </p>
              <p className="text-sm mb-6" style={{ color: 'var(--tf-subtle)' }}>
                {isCoach ? 'Publish your first course for master traders.' : 'Your coach hasn\'t published any courses yet. Check back soon.'}
              </p>
              {isCoach && (
                <button onClick={() => setShowForm(true)} className="btn-gold rounded-xl px-6 py-3 text-sm font-semibold">
                  Add Course →
                </button>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.map(course => {
                const thumb = course.thumbnail_url ?? (course.video_url ? getThumbnail(course.video_url) : null)
                const isMyOwn = course.creator_id === userId
                return (
                  <div key={course.id} className="rounded-2xl overflow-hidden tf-card-bg group"
                    style={{ border: '1px solid var(--tf-border)' }}>
                    {/* Thumbnail */}
                    <div className="relative cursor-pointer" style={{ aspectRatio: '16/9', background: 'var(--tf-card-inner)' }}
                      onClick={() => setPlaying(course)}>
                      {thumb
                        ? <img src={thumb} alt={course.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full grid place-items-center"><div className="text-4xl">🎬</div></div>
                      }
                      {/* Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <div className="w-14 h-14 rounded-full grid place-items-center"
                          style={{ background: 'rgba(201,168,76,.9)' }}>
                          <Play size={22} color="#1F2329" fill="#1F2329" />
                        </div>
                      </div>
                      {/* Badge */}
                      <div className="absolute top-2 right-2">
                        <span className="text-[10px] font-mono px-2 py-1 rounded-full flex items-center gap-1"
                          style={{
                            background: course.is_free ? 'rgba(74,222,128,.15)' : 'rgba(201,168,76,.15)',
                            color: course.is_free ? '#4ADE80' : '#C9A84C',
                            border: course.is_free ? '1px solid rgba(74,222,128,.3)' : '1px solid rgba(201,168,76,.3)',
                          }}>
                          {course.is_free ? <Unlock size={9} /> : <Lock size={9} />}
                          {course.is_free ? 'Free' : 'Premium'}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <div className="text-sm font-semibold mb-1 line-clamp-2" style={{ color: 'var(--tf-text)' }}>{course.title}</div>
                      {course.description && (
                        <div className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--tf-subtle)' }}>{course.description}</div>
                      )}
                      <div className="text-[11px] mb-3" style={{ color: '#C9A84C' }}>
                        by {course.profiles?.full_name ?? 'Coach'}
                      </div>

                      {/* Coach controls */}
                      {isCoach && isMyOwn && (
                        <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--tf-border)' }}>
                          <button onClick={() => toggleFree(course)}
                            className="text-[10px] font-mono px-2.5 py-1 rounded-full transition-all"
                            style={{ border: '1px solid var(--tf-border)', color: 'var(--tf-muted)' }}>
                            {course.is_free ? 'Make Premium' : 'Make Free'}
                          </button>
                          <button onClick={() => deleteCourse(course.id)}
                            className="ml-auto w-7 h-7 rounded-lg grid place-items-center"
                            style={{ border: '1px solid var(--tf-border)' }}>
                            <Trash2 size={12} color="#F87171" />
                          </button>
                        </div>
                      )}

                      {/* Master: watch button */}
                      {!isCoach && (
                        <button onClick={() => setPlaying(course)}
                          className="w-full rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-all mt-1"
                          style={{ background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.2)', color: '#C9A84C' }}>
                          <Play size={13} fill="#C9A84C" /> Watch Now
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
