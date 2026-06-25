import React, { useState, useEffect } from 'react'
import useAppStore from '../store/useAppStore.js'

const PARAM_RANGES = {
  width:      [0.1, 5,    0.05],
  depth:      [0.1, 5,    0.05],
  height:     [0.5, 12,   0.1],
  length:     [0.5, 30,   0.1],
  thickness:  [0.05, 1,   0.05],
  spessore:   [0.03, 0.3, 0.01],
  davanzale:  [0.3, 2.0,  0.05],
  alzata:     [0.10, 0.25, 0.01],
  pedata:     [0.20, 0.40, 0.01],
  larghezza:  [0.5, 30,   0.1],
  profondita: [0.5, 30,   0.1],
  lunghezza:  [0.5, 30,   0.1],
  beamY:      [1,   12,   0.1],
}

const s = {
  panel: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  header: { padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#a0aec0', letterSpacing: 1, borderBottom: '1px solid #0f3460', flexShrink: 0 },
  scroll: { flex: 1, overflowY: 'auto', padding: '8px 12px' },
  section: { marginBottom: 12 },
  label: { fontSize: 11, color: '#607080', marginBottom: 2 },
  value: { fontSize: 12, color: '#e0e0e0', fontWeight: 600 },
  row: { marginBottom: 10 },
  paramLabel: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a0aec0', marginBottom: 3 },
  slider: { width: '100%', accentColor: '#e94560' },
  badge: (color) => ({ display: 'inline-block', padding: '1px 6px', borderRadius: 3, fontSize: 10, background: color + '33', color }),
  btn: { width: '100%', padding: '6px 0', borderRadius: 4, border: 'none', background: '#e94560', color: '#fff', fontSize: 12, cursor: 'pointer', marginTop: 4 },
  connectors: { fontSize: 11, color: '#607080', background: '#0d1b2a', borderRadius: 3, padding: '4px 6px', marginTop: 4 },
}

const CATEGORY_COLOR = { Structure: '#e67e22', Architecture: '#3498db', Detail: '#9b59b6' }

export default function PropertyPanel() {
  const { currentProfile, localComponents, selectedId, setParameter, setCustomProp, removeCustomProp } = useAppStore()
  const [editing, setEditing] = useState({})
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')

  const components = currentProfile
    ? currentProfile.components
    : localComponents

  const component = components.find(c => c.id === selectedId)

  useEffect(() => {
    if (component) setEditing({ ...component.parameters })
  }, [selectedId, component?.parameters])

  if (!component) {
    return (
      <div style={s.panel}>
        <div style={s.header}>PROPRIETÀ</div>
        <div style={{ padding: 16, fontSize: 11, color: '#405060', textAlign: 'center' }}>
          <div style={{ marginBottom: 4 }}>Nessuna selezione</div>
          <div style={{ color: '#304050' }}>Clicca un componente per ispezionarlo</div>
        </div>
      </div>
    )
  }

  const color = CATEGORY_COLOR[component.category] || '#aaa'

  const handleSlider = (name, val) => setEditing(e => ({ ...e, [name]: parseFloat(val) }))

  const handleApply = (name) => {
    if (currentProfile) setParameter(component.id, name, editing[name])
  }

  const connectorEntries = Object.entries(component.connectors || {}).filter(([, v]) => v)

  return (
    <div style={s.panel}>
      <div style={s.header}>PROPRIETÀ</div>
      <div style={s.scroll}>
        <div style={s.section}>
          <div style={{ ...s.value, marginBottom: 2 }}>{component.id}</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={s.badge(color)}>{component.category}</span>
            <span style={s.badge('#607080')}>{component.bim?.ifcClass}</span>
          </div>
          {component.semantic?.tags?.length > 0 && (
            <div style={{ fontSize: 10, color: '#405060' }}>{component.semantic.tags.join(' · ')}</div>
          )}
        </div>

        <div style={{ borderTop: '1px solid #0f3460', paddingTop: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#a0aec0', marginBottom: 6 }}>Parametri</div>
          {Object.entries(editing).map(([name, val]) => {
            const [min, max, step] = PARAM_RANGES[name] || [0, 100, 0.01]
            return (
              <div key={name} style={s.row}>
                <div style={s.paramLabel}>
                  <span>{name}</span>
                  <span style={{ color: '#e0e0e0', fontWeight: 600 }}>{Number(val).toFixed(2)} m</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={val}
                  style={s.slider}
                  onChange={e => handleSlider(name, e.target.value)}
                  onMouseUp={() => handleApply(name)}
                />
              </div>
            )
          })}
          {!currentProfile && (
            <div style={{ fontSize: 10, color: '#405060', marginTop: 4 }}>
              Salva il profilo per applicare le modifiche via API
            </div>
          )}
        </div>

        {connectorEntries.length > 0 && (
          <div style={{ borderTop: '1px solid #0f3460', paddingTop: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a0aec0', marginBottom: 4 }}>Connettori</div>
            <div style={s.connectors}>
              {connectorEntries.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                  <span style={{ color: '#607080' }}>{k}:</span>
                  <span style={{ color: '#3498db' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {component.constraints?.length > 0 && (
          <div style={{ borderTop: '1px solid #0f3460', paddingTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a0aec0', marginBottom: 4 }}>Vincoli</div>
            {component.constraints.map((c, i) => (
              <div key={i} style={{ fontSize: 11, color: '#607080' }}>
                {typeof c === 'string' ? c : c.type}
              </div>
            ))}
          </div>
        )}

        {/* ── Proprietà Personalizzate ── */}
        <div style={{ borderTop: '1px solid #0f3460', paddingTop: 8, marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#a0aec0', marginBottom: 6 }}>Proprietà personalizzate</div>
          {Object.entries(component.customProps || {}).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <div style={{ flex: 1, fontSize: 10, color: '#607080', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</div>
              <input
                value={v}
                onChange={e => setCustomProp(component.id, k, e.target.value)}
                style={{ width: 80, padding: '2px 6px', borderRadius: 4, border: '1px solid #1e3050', background: '#0a1322', color: '#e0e0e0', fontSize: 11, outline: 'none' }}
              />
              <button onClick={() => removeCustomProp(component.id, k)}
                style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '0 2px' }}>×</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            <input
              placeholder="chiave"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              style={{ flex: 1, padding: '3px 6px', borderRadius: 4, border: '1px solid #1e3050', background: '#0a1322', color: '#e0e0e0', fontSize: 10, outline: 'none' }}
            />
            <input
              placeholder="valore"
              value={newVal}
              onChange={e => setNewVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newKey.trim()) {
                  setCustomProp(component.id, newKey.trim(), newVal)
                  setNewKey(''); setNewVal('')
                }
              }}
              style={{ flex: 1, padding: '3px 6px', borderRadius: 4, border: '1px solid #1e3050', background: '#0a1322', color: '#e0e0e0', fontSize: 10, outline: 'none' }}
            />
            <button
              onClick={() => { if (newKey.trim()) { setCustomProp(component.id, newKey.trim(), newVal); setNewKey(''); setNewVal('') } }}
              style={{ padding: '3px 8px', borderRadius: 4, border: 'none', background: '#e94560', color: '#fff', fontSize: 11, cursor: 'pointer' }}
            >+</button>
          </div>
          <div style={{ fontSize: 9, color: '#304050', marginTop: 4 }}>Premi Invio o + per aggiungere</div>
        </div>

        <div style={{ borderTop: '1px solid #0f3460', paddingTop: 8, marginTop: 8 }}>
          <div style={{ fontSize: 11, color: '#607080' }}>Generator: <span style={{ color: '#a0aec0' }}>{component.geometry?.generator || 'N/A'}</span></div>
          <div style={{ fontSize: 11, color: '#607080' }}>IFC: <span style={{ color: '#a0aec0' }}>{component.bim?.ifcClass}</span></div>
        </div>
      </div>
    </div>
  )
}
