import React, { useState, useEffect } from 'react'
import useAppStore from '../store/useAppStore.js'

const EyeIcon = ({ open }) => open ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

const S = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at 20% 50%, #0f1e3a 0%, #0a1020 70%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#e0e0e0',
    padding: 24,
  },
  logo: { fontSize: 11, letterSpacing: 3, color: '#e94560', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', textAlign: 'center' },
  title: { fontSize: 32, fontWeight: 800, color: '#fff', margin: '0 0 4px', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#607080', marginBottom: 36, textAlign: 'center' },
  card: {
    background: '#0d1b2a', border: '1px solid #1e3050', borderRadius: 16,
    padding: 36, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px #00000088',
  },
  tabs: { display: 'flex', marginBottom: 28, borderBottom: '1px solid #1e3050' },
  tab: (active) => ({
    flex: 1, padding: '8px 0', background: 'none', border: 'none',
    color: active ? '#e94560' : '#405060', fontWeight: active ? 700 : 400,
    fontSize: 13, cursor: 'pointer',
    borderBottom: active ? '2px solid #e94560' : '2px solid transparent',
    marginBottom: -1, transition: 'all 0.15s',
  }),
  label: { fontSize: 11, color: '#607080', fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, display: 'block' },
  inputWrap: { position: 'relative', marginBottom: 16 },
  input: {
    width: '100%', padding: '10px 40px 10px 14px', borderRadius: 8,
    border: '1px solid #1e3050', background: '#0a1322',
    color: '#e0e0e0', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', color: '#405060',
    display: 'flex', alignItems: 'center', padding: 2, transition: 'color 0.15s',
  },
  btn: {
    width: '100%', padding: '12px 0', borderRadius: 8, border: 'none',
    background: '#e94560', color: '#fff', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', marginTop: 4, transition: 'opacity 0.15s',
  },
  msg: (type) => ({
    padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 16,
    background: type === 'error' ? '#2a0d0d' : '#0d2a1a',
    border: `1px solid ${type === 'error' ? '#e74c3c' : '#27ae60'}`,
    color: type === 'error' ? '#e74c3c' : '#2ecc71',
  }),
}

function PasswordInput({ value, onChange, onFocus, onBlur, placeholder, style }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ ...S.inputWrap, marginBottom: style?.marginBottom ?? 16 }}>
      <input
        style={{ ...S.input, borderColor: style?.borderColor ?? '#1e3050' }}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <button
        type="button"
        style={S.eyeBtn}
        onClick={() => setShow(s => !s)}
        tabIndex={-1}
        onMouseEnter={e => { e.currentTarget.style.color = '#e94560' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#405060' }}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  )
}

export default function AuthPage() {
  const { authPage, setAuthPage, login, register, status, setStatus } = useAppStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setUsername(''); setPassword(''); setConfirm('')
    setStatus('idle', '')
  }, [authPage])

  const passwordMismatch = authPage === 'register' && confirm && password !== confirm
  const canSubmit = username.trim() && password &&
    (authPage === 'login' || (confirm && !passwordMismatch))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    if (authPage === 'login') await login(username.trim(), password)
    else await register(username.trim(), password)
    setLoading(false)
  }

  return (
    <div style={S.page}>
      <div style={S.logo}>All You Can Cloud</div>
      <h1 style={S.title}>BIM</h1>
      <p style={S.subtitle}>Piattaforma AI per progettazione BIM parametrica</p>

      <div style={S.card}>
        <div style={S.tabs}>
          <button style={S.tab(authPage === 'login')} onClick={() => setAuthPage('login')}>Accedi</button>
          <button style={S.tab(authPage === 'register')} onClick={() => setAuthPage('register')}>Registrati</button>
        </div>

        {status.message && (
          <div style={S.msg(status.type)}>{status.message}</div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={S.label}>USERNAME</label>
          <input
            style={{ ...S.input, marginBottom: 16 }}
            placeholder="Il tuo username"
            value={username}
            onChange={e => { setUsername(e.target.value); setStatus('idle', '') }}
            onFocus={e => { e.target.style.borderColor = '#e94560' }}
            onBlur={e => { e.target.style.borderColor = '#1e3050' }}
            autoFocus
          />

          <label style={S.label}>PASSWORD</label>
          <PasswordInput
            value={password}
            placeholder={authPage === 'register' ? 'Min 6 caratteri' : 'La tua password'}
            onChange={e => { setPassword(e.target.value); setStatus('idle', '') }}
            onFocus={e => { e.target.style.borderColor = '#e94560' }}
            onBlur={e => { e.target.style.borderColor = '#1e3050' }}
          />

          {authPage === 'register' && (
            <>
              <label style={S.label}>CONFERMA PASSWORD</label>
              <PasswordInput
                value={confirm}
                placeholder="Ripeti la password"
                onChange={e => { setConfirm(e.target.value); setStatus('idle', '') }}
                onFocus={e => { e.target.style.borderColor = passwordMismatch ? '#e74c3c' : '#e94560' }}
                onBlur={e => { e.target.style.borderColor = passwordMismatch ? '#e74c3c' : '#1e3050' }}
                style={{ borderColor: passwordMismatch ? '#e74c3c' : '#1e3050', marginBottom: passwordMismatch ? 4 : 16 }}
              />
              {passwordMismatch && (
                <p style={{ fontSize: 11, color: '#e74c3c', marginBottom: 16, marginTop: 0 }}>Le password non coincidono</p>
              )}
            </>
          )}

          <button
            type="submit"
            style={{ ...S.btn, opacity: loading || !canSubmit ? 0.5 : 1 }}
            disabled={loading || !canSubmit}
          >
            {loading ? '...' : authPage === 'login' ? 'Accedi →' : 'Crea account →'}
          </button>
        </form>

        <p style={{ fontSize: 11, color: '#304050', textAlign: 'center', marginTop: 20, marginBottom: 0 }}>
          {authPage === 'login'
            ? <span>Non hai un account? <button onClick={() => setAuthPage('register')} style={{ background: 'none', border: 'none', color: '#e94560', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Registrati</button></span>
            : <span>Hai già un account? <button onClick={() => setAuthPage('login')} style={{ background: 'none', border: 'none', color: '#e94560', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Accedi</button></span>
          }
        </p>
      </div>
    </div>
  )
}
