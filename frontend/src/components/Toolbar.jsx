import React from 'react'
import useAppStore from '../store/useAppStore.js'

const s = {
  bar: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
    background: '#16213e', borderBottom: '1px solid #0f3460', flexShrink: 0, flexWrap: 'wrap',
  },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
    borderRadius: 4, border: '1px solid #1e3050', background: 'transparent',
    color: '#607080', cursor: 'pointer', fontSize: 12, transition: 'all 0.12s',
  },
  title: { fontWeight: 800, fontSize: 13, color: '#e94560', letterSpacing: 0.5, whiteSpace: 'nowrap' },
  projectBadge: {
    fontSize: 11, color: '#a0aec0', background: '#0f3460', padding: '2px 8px',
    borderRadius: 10, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  sep: { width: 1, height: 22, background: '#1e3460', margin: '0 4px' },
  btn: (active, color) => ({
    padding: '4px 11px', borderRadius: 4,
    border: active ? `1px solid ${color || '#e94560'}` : '1px solid #1e3050',
    cursor: 'pointer', fontSize: 12,
    background: active ? (color ? color + '22' : '#e9456018') : '#0d1b2a',
    color: active ? (color || '#e94560') : '#8090a0',
    fontWeight: active ? 700 : 400, transition: 'all 0.12s', whiteSpace: 'nowrap',
  }),
  group: { display: 'flex', gap: 3 },
  status: (type) => ({
    marginLeft: 'auto', fontSize: 11, padding: '3px 9px', borderRadius: 3,
    background: type === 'error' ? '#c0392b22' : type === 'success' ? '#27ae6022' : type === 'loading' ? '#2980b922' : 'transparent',
    color: type === 'error' ? '#e74c3c' : type === 'success' ? '#2ecc71' : type === 'loading' ? '#3498db' : '#607080',
    maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  }),
}

export default function Toolbar() {
  const {
    viewMode, setViewMode,
    detailLevel, setDetailLevel,
    currentProfile, localComponents,
    saveProfile, validate, exportIFC,
    goToProjects, projectName, status,
    undo, redo, history, future,
    logout, currentUser,
  } = useAppStore()

  const hasProfile = !!currentProfile
  const hasContent = localComponents.length > 0 || hasProfile

  return (
    <div style={s.bar}>
      {/* Torna ai progetti */}
      <button
        style={s.backBtn}
        onClick={goToProjects}
        onMouseEnter={e => { e.currentTarget.style.color = '#e0e0e0'; e.currentTarget.style.borderColor = '#e94560' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#607080'; e.currentTarget.style.borderColor = '#1e3050' }}
      >
        ← Progetti
      </button>

      <div style={s.sep} />

      {/* Titolo app */}
      <span style={s.title}>All You Can Cloud BIM</span>

      {/* Nome progetto corrente */}
      {projectName && <span style={s.projectBadge}>📁 {projectName}</span>}

      <div style={s.sep} />

      {/* Azioni */}
      <div style={s.group}>
        <button
          style={{ ...s.btn(false, '#27ae60'), opacity: hasContent ? 1 : 0.35, cursor: hasContent ? 'pointer' : 'not-allowed' }}
          disabled={!hasContent}
          onClick={saveProfile}
          title={hasContent ? `Salva "${projectName}"` : 'Nessun contenuto da salvare'}
        >
          💾 Salva
        </button>
        <button style={s.btn(false, '#8e44ad')} disabled={!hasProfile} onClick={validate}>
          ✓ Valida
        </button>
        <button style={s.btn(false, '#16a085')} disabled={!hasProfile} onClick={exportIFC}>
          ↓ IFC
        </button>
      </div>

      <div style={s.sep} />

      {/* Vista 2D/3D */}
      <div style={s.group}>
        <button style={s.btn(viewMode === '2d')} onClick={() => setViewMode('2d')}>2D</button>
        <button style={s.btn(viewMode === '3d')} onClick={() => setViewMode('3d')}>3D</button>
      </div>

      <div style={s.sep} />

      {/* Dettaglio */}
      <div style={s.group}>
        <button style={s.btn(detailLevel === 'massing')} onClick={() => setDetailLevel('massing')}>Massing</button>
        <button style={s.btn(detailLevel === 'detailed')} onClick={() => setDetailLevel('detailed')}>Detailed</button>
      </div>

      <div style={s.sep} />

      {/* Undo / Redo */}
      <div style={s.group}>
        <button
          style={{ ...s.btn(false), opacity: history.length ? 1 : 0.35, cursor: history.length ? 'pointer' : 'not-allowed', fontSize: 15, padding: '3px 10px' }}
          disabled={!history.length}
          onClick={undo}
          title="Annulla (Undo)"
        >↩</button>
        <button
          style={{ ...s.btn(false), opacity: future.length ? 1 : 0.35, cursor: future.length ? 'pointer' : 'not-allowed', fontSize: 15, padding: '3px 10px' }}
          disabled={!future.length}
          onClick={redo}
          title="Ripristina (Redo)"
        >↪</button>
      </div>

      {/* Stato */}
      {status.message && <span style={s.status(status.type)}>{status.message}</span>}

      {/* Utente + logout */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {currentUser && <span style={{ fontSize: 11, color: '#405060' }}>👤 {currentUser}</span>}
        <button style={{ ...s.btn(false, '#e74c3c'), padding: '3px 10px' }} onClick={logout} title="Esci">⏻</button>
      </div>
    </div>
  )
}
