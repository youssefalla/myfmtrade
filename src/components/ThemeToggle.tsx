'use client'

import { useEffect, useState } from 'react'

export function ThemeToggle({ size = 9 }: { size?: number }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('tf-theme')
    if (stored === 'dark') {
      document.documentElement.classList.add('dark')
      setDark(true)
    } else {
      document.documentElement.classList.remove('dark')
      setDark(false)
    }
  }, [])

  function toggle() {
    const nowDark = document.documentElement.classList.toggle('dark')
    setDark(nowDark)
    localStorage.setItem('tf-theme', nowDark ? 'dark' : 'light')
  }

  const px = size * 4
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      style={{ width: px, height: px, borderRadius: 9999, border: '1px solid var(--tf-border)', color: 'var(--tf-muted)', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', transition: 'border-color .25s, color .25s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#C9A84C'; (e.currentTarget as HTMLElement).style.color = '#C9A84C' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--tf-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--tf-muted)' }}
    >
      {dark ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
        </svg>
      )}
    </button>
  )
}
