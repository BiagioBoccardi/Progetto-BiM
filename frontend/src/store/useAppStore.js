import { create } from 'zustand'
import * as api from '../api/client.js'

// ─── Component factories ────────────────────────────────────────────────────

let seq = { pillar: 1, beam: 1, wall: 1 }

function resetSeq() { seq = { pillar: 1, beam: 1, wall: 1 } }

function mkPillar(x, y, height = 3) {
  const id = `Pillar_${String(seq.pillar++).padStart(3, '0')}`
  return {
    id, type: 'PillarTypeA', category: 'Structure',
    parameters: { width: 0.3, depth: 0.3, height },
    connectors: {}, parent: null, children: [], constraints: [],
    geometry: { generator: 'PillarGenerator', generatorVersion: '1.0' },
    bim: { ifcClass: 'IfcColumn' },
    semantic: { tags: ['structure', 'pillar'] },
    _canvas: { x, y },
  }
}

function mkBeam(startId, endId, sx, sy, ex, ey, height = 3) {
  const id = `Beam_${String(seq.beam++).padStart(3, '0')}`
  const length = Math.round(Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2) / 50 * 100) / 100
  return {
    id, type: 'BeamTypeA', category: 'Structure',
    parameters: { length: Math.max(length, 0.3), width: 0.3, height: 0.5, beamY: height },
    connectors: { startPillar: startId, endPillar: endId },
    parent: null, children: [], constraints: [{ type: 'horizontal' }],
    geometry: { generator: 'BeamGenerator', generatorVersion: '1.0' },
    bim: { ifcClass: 'IfcBeam' },
    semantic: { tags: ['structure', 'beam'] },
    _canvas: { sx, sy, ex, ey },
  }
}

function mkWall(hostId, sx, sy, ex, ey, height = 3) {
  const id = `Wall_${String(seq.wall++).padStart(3, '0')}`
  const length = Math.round(Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2) / 50 * 100) / 100
  return {
    id, type: 'WallTypeA', category: 'Architecture',
    parameters: { length: Math.max(length, 0.1), thickness: 0.25, height },
    connectors: { hostStructure: hostId || null },
    parent: hostId || null, children: [], constraints: [{ type: 'attached_to_parent' }],
    geometry: { generator: 'WallGenerator', generatorVersion: '1.0' },
    bim: { ifcClass: 'IfcWall' },
    semantic: { tags: ['wall'] },
    _canvas: { sx, sy, ex, ey },
  }
}

// ─── Structure template definitions ────────────────────────────────────────

export const STRUCTURE_TEMPLATES = {
  rettangolare: {
    name: 'Rettangolare', icon: '⊞',
    defaults: { campateX: 3, campateY: 2, interasseX: 5, interasseY: 5, altezzaPiano: 3, numPiani: 1 },
    params: [
      { key: 'campateX',    label: 'Campate X',    min: 1, max: 10, step: 1,   unit: '' },
      { key: 'campateY',    label: 'Campate Y',    min: 1, max: 8,  step: 1,   unit: '' },
      { key: 'interasseX',  label: 'Interasse X',  min: 2, max: 12, step: 0.5, unit: 'm' },
      { key: 'interasseY',  label: 'Interasse Y',  min: 2, max: 12, step: 0.5, unit: 'm' },
      { key: 'altezzaPiano',label: 'H. Piano',     min: 2.5, max: 6, step: 0.1, unit: 'm' },
      { key: 'numPiani',    label: 'N° Piani',     min: 1, max: 15, step: 1,   unit: '' },
    ],
  },
  L: {
    name: 'Forma L', icon: '⌐',
    defaults: { campateX1: 4, campateY: 3, campateX2: 2, interasse: 5, altezzaPiano: 3 },
    params: [
      { key: 'campateX1',   label: 'Largh. corpo', min: 2, max: 12, step: 1,   unit: 'c.' },
      { key: 'campateY',    label: 'Profondità',   min: 2, max: 8,  step: 1,   unit: 'c.' },
      { key: 'campateX2',   label: 'Largh. ala',   min: 1, max: 8,  step: 1,   unit: 'c.' },
      { key: 'interasse',   label: 'Interasse',    min: 2, max: 12, step: 0.5, unit: 'm' },
      { key: 'altezzaPiano',label: 'H. Piano',     min: 2.5, max: 6, step: 0.1, unit: 'm' },
    ],
  },
  T: {
    name: 'Forma T', icon: '⊤',
    defaults: { campateX: 4, campateY1: 2, campateY2: 2, interasse: 5, altezzaPiano: 3 },
    params: [
      { key: 'campateX',    label: 'Larghezza tot.', min: 2, max: 12, step: 1,   unit: 'c.' },
      { key: 'campateY1',   label: 'Prof. corpo',    min: 1, max: 6,  step: 1,   unit: 'c.' },
      { key: 'campateY2',   label: 'Prof. ala',      min: 1, max: 6,  step: 1,   unit: 'c.' },
      { key: 'interasse',   label: 'Interasse',      min: 2, max: 12, step: 0.5, unit: 'm' },
      { key: 'altezzaPiano',label: 'H. Piano',       min: 2.5, max: 6, step: 0.1, unit: 'm' },
    ],
  },
  U: {
    name: 'Forma U', icon: '∪',
    defaults: { campateX: 5, campateY: 3, campateAla: 1, interasse: 5, altezzaPiano: 3 },
    params: [
      { key: 'campateX',    label: 'Larghezza',   min: 2, max: 12, step: 1,   unit: 'c.' },
      { key: 'campateY',    label: 'Profondità',  min: 2, max: 8,  step: 1,   unit: 'c.' },
      { key: 'campateAla',  label: 'Largh. ali',  min: 1, max: 4,  step: 1,   unit: 'c.' },
      { key: 'interasse',   label: 'Interasse',   min: 2, max: 12, step: 0.5, unit: 'm' },
      { key: 'altezzaPiano',label: 'H. Piano',    min: 2.5, max: 6, step: 0.1, unit: 'm' },
    ],
  },
}

// ─── Piantina template ──────────────────────────────────────────────────────

export const PIANTINA_DEFAULTS = {
  forma: 'rettangolare',
  larghezza: 12,
  profondita: 8,
  ambientiX: 3,
  ambientiY: 2,
  altezzaPiano: 3,
}

// ─── Generation helpers ────────────────────────────────────────────────────

const PX = 50 // 50px = 1 metro
const OFFSET_X = 80
const OFFSET_Y = 80

function buildGrid(positions, interasseM, altezza) {
  const pillars = []
  const pillarMap = {}
  for (const [col, row] of positions) {
    const key = `${col}_${row}`
    if (pillarMap[key]) continue
    const p = mkPillar(OFFSET_X + col * interasseM * PX, OFFSET_Y + row * interasseM * PX, altezza)
    pillars.push(p)
    pillarMap[key] = p
  }

  const beams = []
  const beamSet = new Set()
  for (const [col, row] of positions) {
    const dirs = [[1, 0], [0, 1]]
    for (const [dc, dr] of dirs) {
      const key2 = `${col + dc}_${row + dr}`
      if (!pillarMap[key2]) continue
      const edgeKey = `${col}_${row}-${col + dc}_${row + dr}`
      if (beamSet.has(edgeKey)) continue
      beamSet.add(edgeKey)
      const a = pillarMap[`${col}_${row}`]
      const b = pillarMap[key2]
      beams.push(mkBeam(a.id, b.id, a._canvas.x, a._canvas.y, b._canvas.x, b._canvas.y, altezza))
    }
  }
  return [...pillars, ...beams]
}

function generateRettangolare(p) {
  const { campateX, campateY, interasseX, interasseY, altezzaPiano } = p
  const positions = []
  for (let i = 0; i <= campateX; i++)
    for (let j = 0; j <= campateY; j++)
      positions.push([i * (interasseX / (interasseX || 1)), j * (interasseY / (interasseY || 1))])

  // For non-square interasse, use x/y separately
  const pillars = []
  const pillarMap = {}
  for (let i = 0; i <= campateX; i++) {
    for (let j = 0; j <= campateY; j++) {
      const key = `${i}_${j}`
      const pl = mkPillar(OFFSET_X + i * interasseX * PX, OFFSET_Y + j * interasseY * PX, altezzaPiano)
      pillars.push(pl)
      pillarMap[key] = pl
    }
  }
  const beams = []
  for (let i = 0; i <= campateX; i++) {
    for (let j = 0; j <= campateY; j++) {
      const a = pillarMap[`${i}_${j}`]
      if (i < campateX) { const b = pillarMap[`${i + 1}_${j}`]; beams.push(mkBeam(a.id, b.id, a._canvas.x, a._canvas.y, b._canvas.x, b._canvas.y, altezzaPiano)) }
      if (j < campateY) { const b = pillarMap[`${i}_${j + 1}`]; beams.push(mkBeam(a.id, b.id, a._canvas.x, a._canvas.y, b._canvas.x, b._canvas.y, altezzaPiano)) }
    }
  }
  return [...pillars, ...beams]
}

function generateL(p) {
  const { campateX1, campateY, campateX2, interasse, altezzaPiano } = p
  const exists = (col, row) => row === campateY || col <= campateX2
  const positions = []
  for (let i = 0; i <= campateX1; i++)
    for (let j = 0; j <= campateY; j++)
      if (exists(i, j)) positions.push([i, j])
  return buildGrid(positions, interasse, altezzaPiano)
}

function generateT(p) {
  const { campateX, campateY1, campateY2, interasse, altezzaPiano } = p
  const stemL = Math.floor((campateX - 2) / 2)
  const stemR = stemL + 2
  const exists = (col, row) => row <= campateY1 || (col >= stemL && col <= stemR)
  const positions = []
  for (let i = 0; i <= campateX; i++)
    for (let j = 0; j <= campateY1 + campateY2; j++)
      if (exists(i, j)) positions.push([i, j])
  return buildGrid(positions, interasse, altezzaPiano)
}

function generateU(p) {
  const { campateX, campateY, campateAla, interasse, altezzaPiano } = p
  const exists = (col, row) => row === campateY || col <= campateAla || col >= campateX - campateAla
  const positions = []
  for (let i = 0; i <= campateX; i++)
    for (let j = 0; j <= campateY; j++)
      if (exists(i, j)) positions.push([i, j])
  return buildGrid(positions, interasse, altezzaPiano)
}

// Renamed to avoid collision with store action — builds wall components from piantina params
function buildPiantinWalls(p) {
  const { forma, larghezza, profondita, ambientiX, ambientiY, altezzaPiano } = p
  const w = larghezza * PX, h = profondita * PX
  const ox = OFFSET_X, oy = OFFSET_Y

  // Reset wall sequence so IDs restart cleanly on each regeneration
  seq.wall = 1

  let perim
  if (forma === 'rettangolare') {
    // Simple closed rectangle (clockwise)
    perim = [
      [ox,     oy,     ox + w, oy    ],  // top
      [ox + w, oy,     ox + w, oy + h],  // right
      [ox + w, oy + h, ox,     oy + h],  // bottom
      [ox,     oy + h, ox,     oy    ],  // left
    ]
  } else if (forma === 'L') {
    // L shape: narrow top-left arm + full-width bottom section
    // +──────+
    // │      │ ← lw wide (40% of total)
    // │      +──────────────+
    // │                     │
    // +─────────────────────+
    const lw = w * 0.40   // width of the narrow arm
    const oh = h * 0.45   // height of the "step" (where the arm ends)
    perim = [
      [ox,      oy,      ox + lw, oy     ],  // top of narrow arm
      [ox + lw, oy,      ox + lw, oy + oh],  // inner vertical step (going down)
      [ox + lw, oy + oh, ox + w,  oy + oh],  // inner horizontal step (going right)
      [ox + w,  oy + oh, ox + w,  oy + h ],  // right side (going down)
      [ox + w,  oy + h,  ox,      oy + h ],  // bottom (going left)
      [ox,      oy + h,  ox,      oy     ],  // left side (going up)
    ]
  } else if (forma === 'T') {
    // T shape: full-width top bar + narrow stem at centre
    // +─────────────────────+
    // +──────+         +────+  ← inner notches
    //        │         │
    //        │  stem   │
    //        +---------+
    const th  = h * 0.35              // bar height
    const sl  = ox + w * 0.35         // stem left x
    const sr  = ox + w * 0.65         // stem right x
    perim = [
      [ox,  oy,       ox + w, oy      ],  // top bar — full width
      [ox + w, oy,    ox + w, oy + th ],  // bar right side going down
      [ox + w, oy + th, sr,   oy + th ],  // right inner horizontal
      [sr,  oy + th,  sr,     oy + h  ],  // stem right side going down
      [sr,  oy + h,   sl,     oy + h  ],  // stem bottom
      [sl,  oy + h,   sl,     oy + th ],  // stem left side going up
      [sl,  oy + th,  ox,     oy + th ],  // left inner horizontal
      [ox,  oy + th,  ox,     oy      ],  // bar left side going up
    ]
  } else if (forma === 'U') {
    // U shape: two arms connected at the bottom, open at the top
    // +──+              +──+
    // │  │              │  │
    // │  +──────────────+  │
    // │                    │
    // +────────────────────+
    const aw = w * 0.28   // arm width
    const oh = h * 0.45   // opening depth from the top (where inner floor is)
    perim = [
      [ox,          oy,      ox + aw,      oy     ],  // top of left arm
      [ox + aw,     oy,      ox + aw,      oy + oh],  // inner left going DOWN to floor
      [ox + aw,     oy + oh, ox + w - aw,  oy + oh],  // inner horizontal floor
      [ox + w - aw, oy + oh, ox + w - aw,  oy     ],  // inner right going UP
      [ox + w - aw, oy,      ox + w,        oy     ],  // top of right arm
      [ox + w,      oy,      ox + w,        oy + h ],  // right outer going down
      [ox + w,      oy + h,  ox,            oy + h ],  // bottom going left
      [ox,          oy + h,  ox,            oy     ],  // left outer going up
    ]
  } else {
    perim = [
      [ox, oy, ox + w, oy], [ox + w, oy, ox + w, oy + h],
      [ox + w, oy + h, ox, oy + h], [ox, oy + h, ox, oy],
    ]
  }

  const comps = []
  perim.forEach(([sx, sy, ex, ey]) => comps.push(mkWall(null, sx, sy, ex, ey, altezzaPiano)))

  // Internal room dividers — only inside the bounding box
  for (let i = 1; i < ambientiX; i++) {
    const x = ox + (w / ambientiX) * i
    comps.push(mkWall(null, x, oy, x, oy + h, altezzaPiano))
  }
  for (let j = 1; j < ambientiY; j++) {
    const y = oy + (h / ambientiY) * j
    comps.push(mkWall(null, ox, y, ox + w, y, altezzaPiano))
  }

  return comps
}

// ─── Store ─────────────────────────────────────────────────────────────────

const useAppStore = create((set, get) => ({
  // --- navigation
  page: 'projects',       // 'projects' | 'editor'
  projectName: '',        // nome del progetto in lavorazione

  // --- profiles
  profileIds: [],
  currentProfile: null,
  localComponents: [],

  // --- selection & view
  selectedId: null,
  viewMode: '2d',
  detailLevel: 'massing',
  canvasMode: 'struttura',

  // --- drawing
  drawingTool: 'select',

  // --- structure template
  structureTemplate: 'rettangolare',
  structureParams: { ...STRUCTURE_TEMPLATES.rettangolare.defaults },

  // --- piantina
  piantinParams: { ...PIANTINA_DEFAULTS },

  // --- AI
  aiMode: 'plan',
  pendingPlan: null,
  aiMessages: [],

  // --- status
  status: { type: 'idle', message: '' },

  // ── navigation ────────────────────────────────────────────────────────────
  openNewProject: (name) => {
    resetSeq()
    const defaultParams = { ...STRUCTURE_TEMPLATES.rettangolare.defaults }
    const comps = generateRettangolare(defaultParams)
    set({
      page: 'editor', projectName: name,
      localComponents: comps, currentProfile: null,
      selectedId: null, pendingPlan: null,
      aiMessages: [], status: { type: 'idle', message: '' },
      structureParams: defaultParams,
      structureTemplate: 'rettangolare',
      piantinParams: { ...PIANTINA_DEFAULTS },
      canvasMode: 'struttura', viewMode: '2d',
    })
  },
  openExistingProject: async (id) => {
    set({ status: { type: 'loading', message: 'Caricamento...' } })
    try {
      const data = await api.getProfile(id)
      set({ page: 'editor', projectName: id, currentProfile: data, localComponents: [], selectedId: null, pendingPlan: null, aiMessages: [], status: { type: 'idle', message: '' } })
    } catch {
      set({ status: { type: 'error', message: 'Progetto non trovato' } })
    }
  },
  goToProjects: () => set({ page: 'projects', status: { type: 'idle', message: '' } }),

  // ── setters ────────────────────────────────────────────────────────────────
  setStatus: (type, message) => set({ status: { type, message } }),
  setSelectedId: id => set({ selectedId: id }),
  setViewMode: mode => set({ viewMode: mode }),
  setDetailLevel: level => set({ detailLevel: level }),
  setCanvasMode: mode => set({ canvasMode: mode, drawingTool: 'select' }),
  setDrawingTool: tool => set({ drawingTool: tool }),
  setAIMode: mode => set({ aiMode: mode }),

  setStructureTemplate: tmpl => {
    const params = { ...STRUCTURE_TEMPLATES[tmpl].defaults }
    resetSeq()
    let comps = []
    if (tmpl === 'rettangolare') comps = generateRettangolare(params)
    else if (tmpl === 'L') comps = generateL(params)
    else if (tmpl === 'T') comps = generateT(params)
    else if (tmpl === 'U') comps = generateU(params)
    set({ structureTemplate: tmpl, structureParams: params, localComponents: comps, currentProfile: null, selectedId: null })
  },
  setStructureParam: (key, value) => set(s => {
    const newParams = { ...s.structureParams, [key]: value }
    resetSeq()
    let comps = []
    if (s.structureTemplate === 'rettangolare') comps = generateRettangolare(newParams)
    else if (s.structureTemplate === 'L') comps = generateL(newParams)
    else if (s.structureTemplate === 'T') comps = generateT(newParams)
    else if (s.structureTemplate === 'U') comps = generateU(newParams)
    return { structureParams: newParams, localComponents: comps, currentProfile: null, selectedId: null }
  }),
  // Auto-rigenera la piantina immediatamente ad ogni modifica (slider o forma)
  setPiantinParam: (key, value) => set(s => {
    const newParams = { ...s.piantinParams, [key]: value }
    const structural = s.localComponents.filter(c => c.category === 'Structure')
    const walls = buildPiantinWalls(newParams)
    return { piantinParams: newParams, localComponents: [...structural, ...walls], selectedId: null }
  }),

  // ── local drawing ─────────────────────────────────────────────────────────
  addPillar: (x, y) => set(s => ({ localComponents: [...s.localComponents, mkPillar(x, y)] })),
  addBeam: (startId, endId, sx, sy, ex, ey) =>
    set(s => ({ localComponents: [...s.localComponents, mkBeam(startId, endId, sx, sy, ex, ey)] })),
  addWall: (hostId, sx, sy, ex, ey) =>
    set(s => ({ localComponents: [...s.localComponents, mkWall(hostId, sx, sy, ex, ey)] })),

  clearLocal: () => { resetSeq(); set({ localComponents: [], currentProfile: null, selectedId: null, pendingPlan: null }) },

  // ── structure generation ──────────────────────────────────────────────────
  generateStructure: () => {
    const { structureTemplate, structureParams } = get()
    resetSeq()
    let comps = []
    if (structureTemplate === 'rettangolare') comps = generateRettangolare(structureParams)
    else if (structureTemplate === 'L') comps = generateL(structureParams)
    else if (structureTemplate === 'T') comps = generateT(structureParams)
    else if (structureTemplate === 'U') comps = generateU(structureParams)
    set({ localComponents: comps, currentProfile: null, selectedId: null })
  },

  // ── piantina generation ──────────────────────────────────────────────────
  generatePiantina: () => {
    const { piantinParams, localComponents } = get()
    const structural = localComponents.filter(c => c.category === 'Structure')
    const walls = buildPiantinWalls(piantinParams)
    set({ localComponents: [...structural, ...walls], selectedId: null })
  },

  // ── API ──────────────────────────────────────────────────────────────────
  loadProfiles: async () => {
    try {
      const data = await api.listProfiles()
      set({ profileIds: data.profiles })
    } catch {
      set({ status: { type: 'error', message: 'Backend non raggiungibile' } })
    }
  },

  loadProfile: async id => {
    set({ status: { type: 'loading', message: 'Caricamento...' } })
    try {
      const data = await api.getProfile(id)
      set({ currentProfile: data, selectedId: null, pendingPlan: null, status: { type: 'idle', message: '' } })
    } catch {
      set({ status: { type: 'error', message: 'Profilo non trovato' } })
    }
  },

  saveProfile: async () => {
    const { localComponents, projectName, currentProfile } = get()
    const profileId = projectName || currentProfile?.profileId || `progetto_${Date.now()}`
    if (!localComponents.length && !currentProfile) {
      set({ status: { type: 'error', message: 'Genera o disegna componenti prima di salvare' } })
      return
    }
    set({ status: { type: 'loading', message: 'Salvataggio...' } })
    const components = localComponents.length
      ? localComponents.map(({ _canvas, ...c }) => c)
      : currentProfile.components
    try {
      const data = await api.createProfile({ profileId, components })
      // Ricarica la lista aggiornata dal backend prima di tornare alla pagina
      let freshIds = get().profileIds
      try {
        const list = await api.listProfiles()
        freshIds = list.profiles
      } catch { /* usa la lista locale come fallback */ }
      set({
        currentProfile: data,
        profileIds: freshIds,
        selectedId: null, pendingPlan: null,
        page: 'projects',
        status: { type: 'success', message: `Progetto "${data.profileId}" salvato con successo` },
      })
    } catch (e) {
      set({ status: { type: 'error', message: e.response?.data?.detail || 'Errore salvataggio' } })
    }
  },

  setParameter: async (componentId, name, value) => {
    const { currentProfile } = get()
    if (!currentProfile) return
    set({ status: { type: 'loading', message: 'Aggiornamento...' } })
    try {
      const data = await api.setParameter(currentProfile.profileId, componentId, name, value)
      set({ currentProfile: data.profile, status: { type: 'success', message: `Rigenerati: ${data.regenerated.join(', ') || 'nessuno'}` } })
    } catch (e) {
      set({ status: { type: 'error', message: e.response?.data?.detail || 'Errore' } })
    }
  },

  validate: async () => {
    const { currentProfile } = get()
    if (!currentProfile) return
    set({ status: { type: 'loading', message: 'Validazione...' } })
    try {
      const data = await api.validateProfile(currentProfile.profileId)
      const v = data.violations
      set({
        status: {
          type: v.length ? 'error' : 'success',
          message: v.length ? `${v.length} violazioni: ${v.map(x => x.message).join(' | ')}` : `OK — ruleset: ${data.ruleset}`,
        },
      })
    } catch (e) {
      set({ status: { type: 'error', message: e.response?.data?.detail || 'Errore' } })
    }
  },

  exportIFC: async () => {
    const { currentProfile } = get()
    if (!currentProfile) return
    set({ status: { type: 'loading', message: 'Export IFC...' } })
    try {
      const data = await api.exportIFC(currentProfile.profileId)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `${currentProfile.profileId}.ifc.json`; a.click()
      URL.revokeObjectURL(url)
      set({ status: { type: 'success', message: 'Export completato' } })
    } catch (e) {
      set({ status: { type: 'error', message: e.response?.data?.detail || 'Errore' } })
    }
  },

  sendAICommand: async command => {
    const { currentProfile, aiMode } = get()
    if (!currentProfile) return
    set(s => ({ aiMessages: [...s.aiMessages, { role: 'user', text: command }], status: { type: 'loading', message: 'AI...' }, pendingPlan: null }))
    try {
      const data = await api.sendAICommand(currentProfile.profileId, command, aiMode.toUpperCase())
      const reply = data.applied
        ? `Eseguito. Rigenerati: ${data.affected?.join(', ') || 'nessuno'}`
        : `Piano: ${data.operations?.map(o => `${o.type}(${JSON.stringify(o.args)})`).join(' → ') || '—'}`
      set(s => ({ aiMessages: [...s.aiMessages, { role: 'assistant', text: reply, raw: data }], pendingPlan: data.applied ? null : data, currentProfile: data.profile || s.currentProfile, status: { type: 'idle', message: '' } }))
    } catch (e) {
      const msg = e.response?.data?.detail || 'Errore AI'
      set(s => ({ aiMessages: [...s.aiMessages, { role: 'assistant', text: `Errore: ${msg}` }], status: { type: 'error', message: msg } }))
    }
  },

  applyPlan: async () => {
    const { currentProfile, pendingPlan } = get()
    if (!currentProfile || !pendingPlan) return
    set({ status: { type: 'loading', message: 'Applicazione piano...' } })
    try {
      const data = await api.applyPlan(currentProfile.profileId, pendingPlan.command, pendingPlan.operations)
      set(s => ({ currentProfile: data.profile, pendingPlan: null, aiMessages: [...s.aiMessages, { role: 'assistant', text: `Piano applicato. Componenti: ${data.affected?.join(', ') || 'nessuno'}` }], status: { type: 'success', message: 'Piano applicato' } }))
    } catch (e) {
      set({ status: { type: 'error', message: e.response?.data?.detail || 'Errore' } })
    }
  },

  rejectPlan: () => set(s => ({ pendingPlan: null, aiMessages: [...s.aiMessages, { role: 'assistant', text: 'Piano rifiutato.' }] })),
}))

export default useAppStore
