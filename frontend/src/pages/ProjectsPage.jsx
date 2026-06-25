import React, { useState, useEffect, useRef } from 'react'
import useAppStore from '../store/useAppStore.js'
import * as apiClient from '../api/client.js'

const trashIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

const S = {
  page: {
    minHeight: '100vh', background: 'radial-gradient(ellipse at 20% 50%, #0f1e3a 0%, #0a1020 70%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#e0e0e0',
  },
  header: { textAlign: 'center', marginBottom: 48 },
  logo: { fontSize: 11, letterSpacing: 3, color: '#e94560', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' },
  title: { fontSize: 36, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.1 },
  subtitle: { fontSize: 14, color: '#607080', marginTop: 8 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, width: '100%', maxWidth: 900 },
  newCard: {
    border: '2px dashed #1e3050', borderRadius: 12, padding: 28,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 10, cursor: 'pointer', background: 'transparent', color: '#607080',
    transition: 'all 0.2s', minHeight: 160,
  },
  newIcon: { fontSize: 32, color: '#e94560', lineHeight: 1 },
  newLabel: { fontSize: 13, fontWeight: 600 },
  card: {
    background: '#0d1b2a', border: '1px solid #1e3050', borderRadius: 12,
    padding: 20, cursor: 'pointer', transition: 'all 0.2s', minHeight: 160,
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
  },
  cardName: { fontSize: 15, fontWeight: 700, color: '#e0e0e0', marginBottom: 4, wordBreak: 'break-all' },
  cardMeta: { fontSize: 11, color: '#405060', lineHeight: 1.8 },
  cardIcon: { fontSize: 28, marginBottom: 8 },
  openBtn: {
    marginTop: 12, padding: '6px 14px', borderRadius: 5, border: 'none',
    background: '#e94560', color: '#fff', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', alignSelf: 'flex-start',
  },
  statusBar: {
    position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
    padding: '8px 20px', borderRadius: 20, fontSize: 12,
    background: '#0d1b2a', border: '1px solid #1e3050', color: '#a0aec0',
  },
}

// ─── New project dialog ───────────────────────────────────────────────────────
function NewProjectDialog({ onConfirm, onCancel }) {
  const [name, setName] = useState('')
  const inputRef = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])

  const confirm = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onConfirm(trimmed.replace(/\s+/g, '_'))
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000000aa',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: '#0d1b2a', border: '1px solid #1e3050', borderRadius: 14,
        padding: 32, width: 360, boxShadow: '0 20px 60px #00000088',
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Nuovo Progetto</div>
        <div style={{ fontSize: 12, color: '#607080', marginBottom: 20 }}>
          Dai un nome al tuo progetto BIM
        </div>
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') onCancel() }}
          placeholder="es. Villetta_Milano_2026"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 6,
            border: '1px solid #1e3050', background: '#0a1322',
            color: '#e0e0e0', fontSize: 14, outline: 'none', marginBottom: 20,
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '8px 16px', borderRadius: 6, border: '1px solid #1e3050',
            background: 'transparent', color: '#607080', cursor: 'pointer', fontSize: 13,
          }}>Annulla</button>
          <button onClick={confirm} disabled={!name.trim()} style={{
            padding: '8px 20px', borderRadius: 6, border: 'none',
            background: name.trim() ? '#e94560' : '#3a1a20', color: name.trim() ? '#fff' : '#604050',
            cursor: name.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 700,
          }}>Crea →</button>
        </div>
      </div>
    </div>
  )
}

// ─── Project card ─────────────────────────────────────────────────────────────
function ProjectCard({ id, onOpen, onDelete }) {
  const [meta, setMeta] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    apiClient.getProfile(id)
      .then(d => setMeta({ count: d.components?.length ?? 0 }))
      .catch(() => setMeta({ count: '?' }))
  }, [id])

  return (
    <div style={S.card}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#e94560'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e3050'; e.currentTarget.style.transform = 'none' }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={S.cardIcon}>🏗</div>
          {confirmDelete ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={e => { e.stopPropagation(); onDelete(id); setConfirmDelete(false) }}
                style={{ padding: '2px 8px', borderRadius: 4, border: 'none', background: '#c0392b', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >Sì</button>
              <button
                onClick={e => { e.stopPropagation(); setConfirmDelete(false) }}
                style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid #1e3050', background: 'transparent', color: '#607080', fontSize: 11, cursor: 'pointer' }}
              >No</button>
            </div>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
              title="Elimina progetto"
              style={{ background: 'none', border: 'none', color: '#405060', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#e74c3c' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#405060' }}
            >{trashIcon}</button>
          )}
        </div>
        <div style={S.cardName}>{id}</div>
        <div style={S.cardMeta}>
          {meta ? `${meta.count} componenti` : 'Caricamento…'}
        </div>
      </div>
      <button style={S.openBtn} onClick={() => onOpen(id)}>Apri →</button>
    </div>
  )
}

// ─── Toast di notifica ───────────────────────────────────────────────────────
function Toast({ status, onDismiss }) {
  useEffect(() => {
    if (!status.message) return
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [status.message])

  if (!status.message) return null

  const isSuccess = status.type === 'success'
  const isError = status.type === 'error'

  return (
    <div style={{
      position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 200, display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 24px', borderRadius: 10,
      background: isSuccess ? '#0d2a1a' : isError ? '#2a0d0d' : '#0d1b2a',
      border: `1px solid ${isSuccess ? '#27ae60' : isError ? '#e74c3c' : '#1e3050'}`,
      boxShadow: '0 8px 32px #00000066',
      color: isSuccess ? '#2ecc71' : isError ? '#e74c3c' : '#a0aec0',
      fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 18 }}>{isSuccess ? '✓' : isError ? '✕' : 'ℹ'}</span>
      {status.message}
      <button
        onClick={onDismiss}
        style={{ marginLeft: 8, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16, lineHeight: 1, opacity: 0.6 }}
      >×</button>
    </div>
  )
}

// ─── User avatar + logout dropdown ───────────────────────────────────────────
function UserMenu() {
  const { currentUser, logout } = useAppStore()
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const initial = (currentUser || '?')[0].toUpperCase()

  return (
    <div ref={ref} style={{ position: 'fixed', top: 20, right: 24, zIndex: 300 }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={currentUser}
        style={{
          width: 38, height: 38, borderRadius: '50%', border: '2px solid #e94560',
          background: '#1a0d18', color: '#e94560', fontWeight: 800, fontSize: 15,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#2a1020' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#1a0d18' }}
      >
        {initial}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 46, right: 0, minWidth: 180,
          background: '#0d1b2a', border: '1px solid #1e3050', borderRadius: 10,
          boxShadow: '0 12px 40px #00000099', overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e3050' }}>
            <div style={{ fontSize: 11, color: '#405060', fontWeight: 600, letterSpacing: 0.5 }}>UTENTE</div>
            <div style={{ fontSize: 13, color: '#e0e0e0', fontWeight: 700, marginTop: 2 }}>{currentUser}</div>
          </div>
          <button
            onClick={() => { setOpen(false); logout() }}
            style={{
              width: '100%', padding: '10px 16px', background: 'none', border: 'none',
              textAlign: 'left', color: '#e74c3c', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1a0808' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Esci dall'account
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const { profileIds, loadProfiles, openNewProject, openExistingProject, deleteProfile, status, setStatus } = useAppStore()
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => { loadProfiles() }, [])

  return (
    <div style={S.page}>
      <UserMenu />
      <Toast status={status} onDismiss={() => setStatus('idle', '')} />

      <div style={S.header}>
        <div style={S.logo}>All You Can Cloud</div>
        <h1 style={S.title}>BIM</h1>
        <p style={S.subtitle}>Piattaforma AI per progettazione BIM parametrica</p>
      </div>

      <div style={S.grid}>
        <button
          style={S.newCard}
          onClick={() => setShowDialog(true)}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#e94560'; e.currentTarget.style.color = '#e0e0e0' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e3050'; e.currentTarget.style.color = '#607080' }}
        >
          <span style={S.newIcon}>+</span>
          <span style={S.newLabel}>Nuovo Progetto</span>
        </button>

        {profileIds.map(id => (
          <ProjectCard key={id} id={id} onOpen={openExistingProject} onDelete={deleteProfile} />
        ))}
      </div>

      {profileIds.length === 0 && (
        <p style={{ marginTop: 32, fontSize: 12, color: '#304050' }}>
          Nessun progetto salvato ancora · Crea il primo progetto per iniziare
        </p>
      )}

      {showDialog && (
        <NewProjectDialog
          onConfirm={name => { setShowDialog(false); openNewProject(name) }}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </div>
  )
}
