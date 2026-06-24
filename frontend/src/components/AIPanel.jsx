import React, { useState, useRef, useEffect } from 'react'
import useAppStore from '../store/useAppStore.js'

const s = {
  panel: { display: 'flex', flexDirection: 'column', height: '100%', borderTop: '1px solid #0f3460', overflow: 'hidden' },
  header: { padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#a0aec0', letterSpacing: 1, borderBottom: '1px solid #0f3460', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  messages: { flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 },
  bubble: (role) => ({
    maxWidth: '90%', padding: '6px 10px', borderRadius: role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
    alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
    background: role === 'user' ? '#e9456020' : '#0f3460',
    color: role === 'user' ? '#e0e0e0' : '#c0cfe0',
    fontSize: 12, lineHeight: 1.4,
    border: role === 'user' ? '1px solid #e9456040' : 'none',
  }),
  footer: { padding: '8px 10px', borderTop: '1px solid #0f3460', flexShrink: 0 },
  modeRow: { display: 'flex', gap: 4, marginBottom: 6 },
  modeBtn: (active) => ({
    flex: 1, padding: '3px 0', borderRadius: 3, border: 'none', cursor: 'pointer', fontSize: 10,
    background: active ? '#e94560' : '#0f3460', color: active ? '#fff' : '#a0aec0', fontWeight: active ? 700 : 400,
  }),
  inputRow: { display: 'flex', gap: 6 },
  input: {
    flex: 1, background: '#0d1b2a', border: '1px solid #1e3050', borderRadius: 4,
    color: '#e0e0e0', padding: '5px 8px', fontSize: 12, outline: 'none',
  },
  send: { padding: '5px 12px', borderRadius: 4, border: 'none', background: '#e94560', color: '#fff', fontSize: 12, cursor: 'pointer' },
  planBox: { background: '#0f3460', borderRadius: 4, padding: '6px 10px', marginBottom: 6, border: '1px solid #e9456040' },
  planBtns: { display: 'flex', gap: 6, marginTop: 6 },
  approveBtn: { flex: 1, padding: '4px 0', borderRadius: 3, border: 'none', background: '#27ae60', color: '#fff', fontSize: 11, cursor: 'pointer' },
  rejectBtn: { flex: 1, padding: '4px 0', borderRadius: 3, border: 'none', background: '#c0392b', color: '#fff', fontSize: 11, cursor: 'pointer' },
}

const MODE_LABELS = { automatic: 'Auto', assisted: 'Assistita', plan: 'Plan' }
const MODE_DESCS = {
  automatic: 'AI esegue subito senza conferma',
  assisted: 'AI propone elemento per elemento',
  plan: 'AI mostra il piano, tu approvi poi esegue',
}

export default function AIPanel() {
  const { aiMode, setAIMode, aiMessages, sendAICommand, pendingPlan, applyPlan, rejectPlan, currentProfile, status } = useAppStore()
  const [input, setInput] = useState('')
  const msgRef = useRef()

  useEffect(() => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight
  }, [aiMessages, pendingPlan])

  const send = () => {
    if (!input.trim() || !currentProfile) return
    sendAICommand(input.trim())
    setInput('')
  }

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <span>AI ASSISTENTE</span>
        {!currentProfile && <span style={{ fontSize: 10, color: '#c0392b' }}>Salva un profilo per usare l'AI</span>}
      </div>

      <div ref={msgRef} style={s.messages}>
        {aiMessages.length === 0 && (
          <div style={{ fontSize: 11, color: '#405060', textAlign: 'center', marginTop: 8 }}>
            <div>Scrivi un comando in linguaggio naturale.</div>
            <div style={{ color: '#304050', marginTop: 2 }}>Es: "aggiungi un balcone al muro nord"</div>
          </div>
        )}
        {aiMessages.map((m, i) => (
          <div key={i} style={s.bubble(m.role)}>{m.text}</div>
        ))}
        {status.type === 'loading' && <div style={{ fontSize: 10, color: '#607080', alignSelf: 'flex-start' }}>AI sta elaborando…</div>}

        {pendingPlan && (
          <div style={s.planBox}>
            <div style={{ fontSize: 10, color: '#e94560', fontWeight: 700, marginBottom: 4 }}>PIANO IN ATTESA DI APPROVAZIONE</div>
            {pendingPlan.operations?.map((op, i) => (
              <div key={i} style={{ fontSize: 11, color: '#a0aec0', marginBottom: 2 }}>
                {i + 1}. <span style={{ color: '#e67e22' }}>{op.type}</span>{' '}
                {op.args && Object.keys(op.args).length > 0 && (
                  <span style={{ color: '#607080' }}>{JSON.stringify(op.args)}</span>
                )}
              </div>
            ))}
            <div style={s.planBtns}>
              <button style={s.approveBtn} onClick={applyPlan}>✓ Approva ed esegui</button>
              <button style={s.rejectBtn} onClick={rejectPlan}>✕ Rifiuta</button>
            </div>
          </div>
        )}
      </div>

      <div style={s.footer}>
        <div style={s.modeRow}>
          {Object.keys(MODE_LABELS).map(mode => (
            <button key={mode} style={s.modeBtn(aiMode === mode)} title={MODE_DESCS[mode]} onClick={() => setAIMode(mode)}>
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>
        <div style={s.inputRow}>
          <input
            style={s.input}
            placeholder={currentProfile ? `Modalità: ${MODE_LABELS[aiMode]} · Scrivi comando…` : 'Salva prima un profilo…'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={!currentProfile}
          />
          <button style={{ ...s.send, opacity: !currentProfile || !input.trim() ? 0.4 : 1 }}
            onClick={send} disabled={!currentProfile || !input.trim()}>
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
