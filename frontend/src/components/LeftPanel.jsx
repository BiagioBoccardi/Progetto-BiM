import React, { useState } from 'react'
import useAppStore, { STRUCTURE_TEMPLATES, PIANTINA_DEFAULTS } from '../store/useAppStore.js'

// ─── shared styles ──────────────────────────────────────────────────────────
const C = {
  panel: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#12192e' },
  sectionHeader: {
    padding: '7px 12px', fontSize: 10, fontWeight: 700, color: '#607080',
    letterSpacing: 1.2, borderBottom: '1px solid #0f3460', flexShrink: 0, textTransform: 'uppercase',
  },
  scroll: { flex: 1, overflowY: 'auto', padding: '8px 10px' },
  toolBtn: (active) => ({
    display: 'flex', alignItems: 'center', gap: 7,
    width: '100%', padding: '6px 10px', marginBottom: 4,
    borderRadius: 5, border: active ? '1px solid #e94560' : '1px solid #1e3050',
    background: active ? '#e9456018' : '#0d1b2a',
    color: active ? '#e94560' : '#a0aec0',
    cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 400,
    textAlign: 'left', transition: 'all 0.12s',
  }),
  toolIcon: { fontSize: 15, minWidth: 18, textAlign: 'center' },
  templateRow: { display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' },
  tmplBtn: (active) => ({
    flex: 1, minWidth: 52, padding: '5px 4px', borderRadius: 4,
    border: active ? '1px solid #e94560' : '1px solid #1e3050',
    background: active ? '#e9456018' : '#0d1b2a',
    color: active ? '#e94560' : '#8090a0',
    cursor: 'pointer', fontSize: 11, fontWeight: active ? 700 : 400,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
  }),
  tmplIcon: { fontSize: 14 },
  paramRow: { marginBottom: 9 },
  paramLabel: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#a0aec0', marginBottom: 3 },
  paramValue: { color: '#e0e0e0', fontWeight: 700 },
  slider: { width: '100%', accentColor: '#e94560', cursor: 'pointer' },
  generateBtn: {
    width: '100%', padding: '8px 0', borderRadius: 5, border: 'none',
    background: 'linear-gradient(90deg, #e94560, #c0392b)',
    color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    marginTop: 6, letterSpacing: 0.5,
  },
  clearBtn: {
    width: '100%', padding: '5px 0', borderRadius: 5, border: '1px solid #1e3050',
    background: 'transparent', color: '#607080', fontSize: 11, cursor: 'pointer', marginTop: 4,
  },
  divider: { height: 1, background: '#0f3460', margin: '8px 0' },
  hint: { fontSize: 10, color: '#405060', textAlign: 'center', marginTop: 6, lineHeight: 1.4 },
}

// ─── Drawing Tools ──────────────────────────────────────────────────────────
const STRUTTURA_TOOLS = [
  { id: 'select', icon: '↖', label: 'Seleziona' },
  { id: 'pillar', icon: '■', label: 'Pilastro', hint: 'Click sulla griglia' },
  { id: 'beam',   icon: '━', label: 'Trave',    hint: 'Pilastro A → Pilastro B' },
]

const PIANTINA_TOOLS = [
  { id: 'select', icon: '↖', label: 'Seleziona' },
  { id: 'wall',   icon: '▭', label: 'Muro',     hint: 'Click inizio → Click fine' },
]

function DrawingTools({ tools }) {
  const { drawingTool, setDrawingTool } = useAppStore()
  return (
    <div style={{ padding: '6px 10px 0' }}>
      {tools.map(t => (
        <button key={t.id} style={C.toolBtn(drawingTool === t.id)} onClick={() => setDrawingTool(t.id)}>
          <span style={C.toolIcon}>{t.icon}</span>
          <div>
            <div>{t.label}</div>
            {t.hint && <div style={{ fontSize: 9, color: '#607080', fontWeight: 400 }}>{t.hint}</div>}
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Strutture section ──────────────────────────────────────────────────────
function StrutturePanel() {
  const { structureTemplate, structureParams, setStructureTemplate, setStructureParam, generateStructure, clearLocal } = useAppStore()
  const tmpl = STRUCTURE_TEMPLATES[structureTemplate]

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
      <div style={{ fontSize: 10, color: '#607080', marginBottom: 6 }}>Template struttura</div>

      {/* Template selector */}
      <div style={C.templateRow}>
        {Object.entries(STRUCTURE_TEMPLATES).map(([key, t]) => (
          <button key={key} style={C.tmplBtn(structureTemplate === key)} onClick={() => setStructureTemplate(key)}>
            <span style={C.tmplIcon}>{t.icon}</span>
            <span>{t.name.split(' ').pop()}</span>
          </button>
        ))}
      </div>

      {/* Preview shape */}
      <ShapePreview shape={structureTemplate} params={structureParams} />

      <div style={C.divider} />

      {/* Param sliders — live update */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: '#607080' }}>Dimensioni personalizzate</span>
        <span style={{ fontSize: 9, color: '#27ae60' }}>live</span>
      </div>
      {tmpl.params.map(({ key, label, min, max, step, unit }) => {
        const val = structureParams[key] ?? tmpl.defaults[key]
        return (
          <div key={key} style={C.paramRow}>
            <div style={C.paramLabel}>
              <span>{label}</span>
              <span style={C.paramValue}>{Number(val).toFixed(step < 1 ? 1 : 0)}{unit ? ' ' + unit : ''}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={val} style={C.slider}
              onChange={e => setStructureParam(key, step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))} />
          </div>
        )
      })}

      <button style={C.generateBtn} onClick={generateStructure}>
        ⚡ Genera Struttura
      </button>
      <button style={C.clearBtn} onClick={clearLocal}>
        ✕ Cancella tutto
      </button>

      <div style={C.hint}>
        Genera la struttura, poi usa<br />
        gli strumenti per aggiungere manualmente
      </div>
    </div>
  )
}

// ─── Shape preview (SVG) ────────────────────────────────────────────────────
function ShapePreview({ shape, params }) {
  const size = 80
  const pad = 8
  const inner = size - pad * 2

  const style = { fill: 'none', stroke: '#e94560', strokeWidth: 1.5, strokeLinejoin: 'round' }

  let path = null
  if (shape === 'rettangolare') {
    path = `M${pad},${pad} H${size - pad} V${size - pad} H${pad} Z`
  } else if (shape === 'L') {
    // narrow top-left arm + wide bottom
    const lw = pad + inner * 0.40
    const oh = pad + inner * 0.45
    path = `M${pad},${pad} H${lw} V${oh} H${size - pad} V${size - pad} H${pad} Z`
  } else if (shape === 'T') {
    // wide top bar + narrow central stem
    const th = pad + inner * 0.35
    const sl = pad + inner * 0.35
    const sr = pad + inner * 0.65
    path = `M${pad},${pad} H${size - pad} V${th} H${sr} V${size - pad} H${sl} V${th} H${pad} Z`
  } else if (shape === 'U') {
    // two arms connected at the bottom, open at top
    const aw = inner * 0.28
    const oh = pad + inner * 0.45
    path = `M${pad},${pad} H${pad + aw} V${oh} H${size - pad - aw} V${pad} H${size - pad} V${size - pad} H${pad} Z`
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
      <svg width={size} height={size} style={{ background: '#0d1b2a', borderRadius: 4, border: '1px solid #1e3050' }}>
        {path && <path d={path} {...style} />}
        {/* Pillar dots */}
        {shape === 'rettangolare' && [
          [pad, pad], [pad + inner, pad], [pad, pad + inner], [pad + inner, pad + inner],
          [pad + inner / 2, pad], [pad + inner / 2, pad + inner],
          [pad, pad + inner / 2], [pad + inner, pad + inner / 2],
        ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2} fill='#e67e22' />)}
      </svg>
    </div>
  )
}

// ─── Piantina section ────────────────────────────────────────────────────────
const PIANTINA_FORME = [
  { id: 'rettangolare', icon: '⊞', label: 'Rett.' },
  { id: 'L',           icon: '⌐', label: 'L' },
  { id: 'T',           icon: '⊤', label: 'T' },
  { id: 'U',           icon: '∪', label: 'U' },
]

const PIANTINA_PARAMS = [
  { key: 'larghezza',    label: 'Larghezza', min: 4, max: 40, step: 0.5, unit: 'm' },
  { key: 'profondita',   label: 'Profondità', min: 4, max: 30, step: 0.5, unit: 'm' },
  { key: 'ambientiX',   label: 'Ambienti orizzontali', min: 1, max: 8, step: 1, unit: '' },
  { key: 'ambientiY',   label: 'Ambienti verticali',   min: 1, max: 6, step: 1, unit: '' },
  { key: 'altezzaPiano',label: 'H. Piano',    min: 2.5, max: 6, step: 0.1, unit: 'm' },
]

function PiantinaPanel() {
  const { piantinParams, setPiantinParam, generatePiantina, localComponents } = useAppStore()
  const wallCount = localComponents.filter(c => c.category === 'Architecture').length

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
      {/* Forma — cambia shape e rigenera automaticamente */}
      <div style={{ fontSize: 10, color: '#607080', marginBottom: 6 }}>Forma edificio</div>
      <div style={C.templateRow}>
        {PIANTINA_FORME.map(f => (
          <button key={f.id} style={C.tmplBtn(piantinParams.forma === f.id)}
            onClick={() => setPiantinParam('forma', f.id)}>
            <span style={C.tmplIcon}>{f.icon}</span>
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      {/* Preview forma selezionata */}
      <PiantinaPreview shape={piantinParams.forma} />

      <div style={C.divider} />

      {/* Sliders — ogni modifica rigenera live */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: '#607080' }}>Dimensioni piantina</span>
        <span style={{ fontSize: 9, color: wallCount > 0 ? '#27ae60' : '#405060' }}>
          {wallCount > 0 ? `✓ ${wallCount} muri generati` : 'aggiorna slider per generare'}
        </span>
      </div>
      {PIANTINA_PARAMS.map(({ key, label, min, max, step, unit }) => {
        const val = piantinParams[key] ?? PIANTINA_DEFAULTS[key]
        return (
          <div key={key} style={C.paramRow}>
            <div style={C.paramLabel}>
              <span>{label}</span>
              <span style={C.paramValue}>
                {Number(val).toFixed(step < 1 ? 1 : 0)}{unit ? ' ' + unit : ''}
              </span>
            </div>
            <input
              type="range" min={min} max={max} step={step} value={val} style={C.slider}
              onChange={e => setPiantinParam(key, step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
            />
          </div>
        )
      })}

      {/* Pulsante manuale come fallback */}
      <button
        style={{ ...C.generateBtn, background: 'linear-gradient(90deg, #3498db, #2980b9)', marginTop: 10 }}
        onClick={generatePiantina}>
        🏠 Genera / Rigenera Piantina
      </button>

      <div style={C.hint}>
        La piantina si rigenera automaticamente<br />
        ad ogni modifica di forma o dimensione
      </div>
    </div>
  )
}

// Preview SVG forma piantina (separata dalla preview struttura)
function PiantinaPreview({ shape }) {
  const size = 72, pad = 8, inner = size - pad * 2
  const style = { fill: '#3498db18', stroke: '#3498db', strokeWidth: 1.5, strokeLinejoin: 'round' }

  let path = ''
  if (shape === 'rettangolare') {
    path = `M${pad},${pad} H${size - pad} V${size - pad} H${pad} Z`
  } else if (shape === 'L') {
    const lw = pad + inner * 0.40, oh = pad + inner * 0.45
    path = `M${pad},${pad} H${lw} V${oh} H${size - pad} V${size - pad} H${pad} Z`
  } else if (shape === 'T') {
    const th = pad + inner * 0.35, sl = pad + inner * 0.35, sr = pad + inner * 0.65
    path = `M${pad},${pad} H${size - pad} V${th} H${sr} V${size - pad} H${sl} V${th} H${pad} Z`
  } else if (shape === 'U') {
    const aw = inner * 0.28, oh = pad + inner * 0.45
    path = `M${pad},${pad} H${pad + aw} V${oh} H${size - pad - aw} V${pad} H${size - pad} V${size - pad} H${pad} Z`
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 2px' }}>
      <svg width={size} height={size} style={{ background: '#0d1b2a', borderRadius: 4, border: '1px solid #1e3050' }}>
        {path && <path d={path} {...style} />}
      </svg>
    </div>
  )
}

// ─── Collapsible section header ─────────────────────────────────────────────
function SectionHeader({ label, open, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '7px 12px', border: 'none', cursor: 'pointer',
        background: '#0d1527', borderBottom: '1px solid #0f3460', flexShrink: 0,
        fontSize: 10, fontWeight: 700, color: '#8090a8', letterSpacing: 1.2,
        textTransform: 'uppercase', textAlign: 'left', transition: 'background 0.12s',
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 10, color: '#405060', transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▾</span>
    </button>
  )
}

// ─── Main LeftPanel ─────────────────────────────────────────────────────────
export default function LeftPanel() {
  const { canvasMode } = useAppStore()
  const isStruttura = canvasMode === 'struttura'
  const tools = isStruttura ? STRUTTURA_TOOLS : PIANTINA_TOOLS

  const [toolsOpen, setToolsOpen] = useState(true)
  const [secondOpen, setSecondOpen] = useState(true)

  return (
    <div style={C.panel}>
      {/* ── Strumenti di Disegno ── */}
      <SectionHeader
        label="Strumenti di Disegno"
        open={toolsOpen}
        onToggle={() => setToolsOpen(o => !o)}
      />
      {toolsOpen && <DrawingTools tools={tools} />}

      {/* ── Strutture / Piantina ── */}
      <SectionHeader
        label={isStruttura ? 'Strutture' : 'Piantina'}
        open={secondOpen}
        onToggle={() => setSecondOpen(o => !o)}
      />
      {secondOpen && (isStruttura ? <StrutturePanel /> : <PiantinaPanel />)}
    </div>
  )
}
