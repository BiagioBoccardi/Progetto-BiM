import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Stage, Layer, Line, Rect, Circle, Text, Group, Arc } from 'react-konva'
import useAppStore from '../store/useAppStore.js'

const GRID = 50
const PILLAR_R = 10
const SNAP = GRID
const SCALE_MIN = 0.1
const SCALE_MAX = 8
const SCALE_STEP = 1.12

function snapWorld(v) { return Math.round(v / SNAP) * SNAP }

function snapToWall(walls, wx, wy, maxDist = 100) {
  let best = null, bestD2 = maxDist * maxDist
  for (const w of walls) {
    const { sx, sy, ex, ey } = w._canvas
    const dx = ex - sx, dy = ey - sy
    const len2 = dx * dx + dy * dy
    if (len2 < 4) continue
    const t = Math.max(0.05, Math.min(0.95, ((wx - sx) * dx + (wy - sy) * dy) / len2))
    const px = sx + t * dx, py = sy + t * dy
    const d2 = (wx - px) ** 2 + (wy - py) ** 2
    if (d2 < bestD2) {
      bestD2 = d2
      best = { x: px, y: py, angle: Math.atan2(dy, dx) * 180 / Math.PI, wallId: w.id }
    }
  }
  return best
}

const COMP_COLOR = { Structure: '#e67e22', Architecture: '#3498db', Detail: '#9b59b6' }
const IFC_COLOR = {
  IfcColumn: '#e67e22', IfcBeam: '#e67e22', IfcFooting: '#e67e22',
  IfcWall: '#3498db',
  IfcDoor: '#9b59b6', IfcWindow: '#1abc9c',
  IfcSlab: '#27ae60', IfcStair: '#f39c12',
}

// ─── Component shape ──────────────────────────────────────────────────────────
function ComponentShape({ component, isSelected, onSelect, stagePos, stageScale }) {
  const cv = component._canvas
  if (!cv) return null
  const ifc = component.bim?.ifcClass
  const color = IFC_COLOR[ifc] || COMP_COLOR[component.category] || '#aaa'
  const sel = isSelected ? '#fff' : '#0d1b2a'

  const handleClick = (e) => {
    e.cancelBubble = true
    let wx, wy
    if (cv.x !== undefined) { wx = cv.x; wy = cv.y }
    else { wx = (cv.sx + cv.ex) / 2; wy = (cv.sy + cv.ey) / 2 }
    onSelect(component.id, wx * stageScale + stagePos.x, wy * stageScale + stagePos.y)
  }

  // ── Pilastro ──
  if (ifc === 'IfcColumn') {
    return (
      <Group onClick={handleClick}>
        <Rect x={cv.x - PILLAR_R} y={cv.y - PILLAR_R} width={PILLAR_R * 2} height={PILLAR_R * 2}
          fill={color} stroke={isSelected ? '#fff' : '#0d1b2a'} strokeWidth={isSelected ? 2 : 1} cornerRadius={2} />
        <Text text={component.id.replace('Pillar_', 'P')} x={cv.x + PILLAR_R + 2} y={cv.y - 5} fontSize={8} fill='#a0aec0' />
      </Group>
    )
  }

  // ── Trave / Muro ──
  if (ifc === 'IfcBeam' || ifc === 'IfcWall') {
    const { sx, sy, ex, ey } = cv
    const dx = ex - sx, dy = ey - sy
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 2) return null
    const thick = ifc === 'IfcBeam' ? 6 : 13
    const nx = -dy / len, ny = dx / len
    const pts = [
      sx + nx * thick / 2, sy + ny * thick / 2,
      ex + nx * thick / 2, ey + ny * thick / 2,
      ex - nx * thick / 2, ey - ny * thick / 2,
      sx - nx * thick / 2, sy - ny * thick / 2,
    ]
    return (
      <Group onClick={handleClick}>
        <Line points={pts} closed fill={color} stroke={isSelected ? '#fff' : '#0d1b2a'}
          strokeWidth={isSelected ? 2 : 1} opacity={ifc === 'IfcWall' ? 0.75 : 0.9} />
        <Text text={component.id[0]} x={(sx + ex) / 2 - 3} y={(sy + ey) / 2 - 4} fontSize={8} fill='#fff' opacity={0.6} />
      </Group>
    )
  }

  // ── Porta: rettangolo + arco di apertura, orientata sul muro ──
  if (ifc === 'IfcDoor') {
    const R = 20
    return (
      <Group onClick={handleClick} x={cv.x} y={cv.y} rotation={cv.angle || 0}>
        <Rect x={-R / 2} y={-4} width={R} height={8}
          fill={color} stroke={sel} strokeWidth={isSelected ? 2 : 1} opacity={0.9} />
        <Arc innerRadius={0} outerRadius={R} angle={90} rotation={0}
          stroke={color} strokeWidth={1.5} fill={color + '33'} />
        <Text text='D' x={-4} y={-4} fontSize={7} fill='#fff' opacity={0.8} />
      </Group>
    )
  }

  // ── Finestra: rettangolo con 2 linee interne ──
  if (ifc === 'IfcWindow') {
    const W = 24, H = 8
    return (
      <Group onClick={handleClick} x={cv.x - W / 2} y={cv.y - H / 2}>
        <Rect width={W} height={H} fill={color + '40'} stroke={color}
          strokeWidth={isSelected ? 2 : 1.5} />
        <Line points={[W / 3, 0, W / 3, H]} stroke={color} strokeWidth={1} opacity={0.7} />
        <Line points={[W * 2 / 3, 0, W * 2 / 3, H]} stroke={color} strokeWidth={1} opacity={0.7} />
        <Text text='W' x={W / 2 - 3} y={H / 2 - 4} fontSize={7} fill={color} />
      </Group>
    )
  }

  // ── Fondazione: cerchio con croce ──
  if (ifc === 'IfcFooting') {
    const R = 16
    return (
      <Group onClick={handleClick} x={cv.x} y={cv.y}>
        <Circle radius={R} fill={color + '30'} stroke={color} strokeWidth={isSelected ? 2 : 1.5}
          dash={isSelected ? [] : [4, 3]} />
        <Line points={[-R, 0, R, 0]} stroke={color} strokeWidth={1} opacity={0.7} />
        <Line points={[0, -R, 0, R]} stroke={color} strokeWidth={1} opacity={0.7} />
        <Text text='F' x={-3} y={-4} fontSize={7} fill={color} />
      </Group>
    )
  }

  // ── Solaio: rettangolo semi-trasparente con tratteggio ──
  if (ifc === 'IfcSlab') {
    const { sx, sy, ex, ey } = cv
    const w = ex - sx, h = ey - sy
    const lines = []
    for (let i = 1; i < 4; i++) lines.push(
      <Line key={i} points={[sx + w * i / 4, sy, sx + w * i / 4, ey]} stroke={color} strokeWidth={0.5} opacity={0.4} />
    )
    return (
      <Group onClick={handleClick}>
        <Rect x={sx} y={sy} width={w} height={h}
          fill={color + '25'} stroke={color} strokeWidth={isSelected ? 2 : 1} dash={[6, 4]} />
        {lines}
        <Text text='SL' x={sx + w / 2 - 5} y={sy + h / 2 - 4} fontSize={8} fill={color} opacity={0.8} />
      </Group>
    )
  }

  // ── Scala: rettangolo con linee orizzontali (gradini) + freccia ──
  if (ifc === 'IfcStair') {
    const { sx, sy, ex, ey } = cv
    const w = ex - sx, h = ey - sy
    const steps = Math.max(3, Math.min(10, Math.round(Math.abs(h) / 14)))
    const lines = []
    for (let i = 1; i < steps; i++) {
      const y = sy + h * i / steps
      lines.push(<Line key={i} points={[sx, y, ex, y]} stroke={color} strokeWidth={0.8} opacity={0.6} />)
    }
    const mx = sx + w / 2
    return (
      <Group onClick={handleClick}>
        <Rect x={sx} y={sy} width={w} height={h}
          fill={color + '20'} stroke={color} strokeWidth={isSelected ? 2 : 1.5} />
        {lines}
        <Line points={[mx, sy + 4, mx, ey - 4]} stroke={color} strokeWidth={1.5} opacity={0.5} />
        <Line points={[mx - 5, sy + 10, mx, sy + 4, mx + 5, sy + 10]} stroke={color} strokeWidth={1.5} opacity={0.7} />
        <Text text='SC' x={sx + w / 2 - 5} y={sy + h / 2 - 4} fontSize={8} fill={color} opacity={0.8} />
      </Group>
    )
  }

  return null
}

// ─── Grid (drawn in world space) ──────────────────────────────────────────────
function GridLines({ viewBounds, scale }) {
  const { x0, y0, x1, y1 } = viewBounds
  // Show major grid at multiples of 5m when zoomed out
  const gridStep = scale < 0.4 ? GRID * 5 : GRID
  const boldStep = GRID * 5

  const lines = []
  const startCol = Math.floor(x0 / gridStep) * gridStep
  const startRow = Math.floor(y0 / gridStep) * gridStep

  for (let x = startCol; x <= x1 + gridStep; x += gridStep) {
    const bold = Math.abs(x % boldStep) < 1
    lines.push(<Line key={`v${x}`} points={[x, y0 - gridStep, x, y1 + gridStep]}
      stroke={bold ? '#1e3050' : '#131f35'} strokeWidth={bold ? 1 : 0.5} />)
  }
  for (let y = startRow; y <= y1 + gridStep; y += gridStep) {
    const bold = Math.abs(y % boldStep) < 1
    lines.push(<Line key={`h${y}`} points={[x0 - gridStep, y, x1 + gridStep, y]}
      stroke={bold ? '#1e3050' : '#131f35'} strokeWidth={bold ? 1 : 0.5} />)
  }

  // Origin axes
  lines.push(<Line key='ax' points={[0, y0 - gridStep, 0, y1 + gridStep]} stroke='#e9456030' strokeWidth={1} />)
  lines.push(<Line key='ay' points={[x0 - gridStep, 0, x1 + gridStep, 0]} stroke='#e9456030' strokeWidth={1} />)

  return <>{lines}</>
}

// ─── Main canvas ──────────────────────────────────────────────────────────────
export default function DrawingCanvas() {
  const {
    drawingTool, canvasMode,
    localComponents, currentProfile,
    addPillar, addBeam, addWall, addDoor, addWindow, addSlab, addFooting, addStair,
    deleteComponent, duplicateComponent, moveComponent,
    deleteComponents, moveComponents,
    selectedId, setSelectedId,
    detailLevel,
  } = useAppStore()

  const containerRef = useRef()
  const stageRef     = useRef()
  const [size, setSize] = useState({ w: 800, h: 500 })

  // Pan & zoom state
  const [stagePos,   setStagePos]   = useState({ x: 60, y: 60 })
  const [stageScale, setStageScale] = useState(1)
  const [spaceDown,  setSpaceDown]  = useState(false)
  const [isPanning,  setIsPanning]  = useState(false)
  const panOrigin = useRef(null) // { mx, my, sx, sy }
  const doorSnapRef = useRef(null)

  // Drawing state
  const [beamStart,  setBeamStart]  = useState(null)
  const [lineStart,  setLineStart]  = useState(null)
  const [cursorWorld, setCursorWorld] = useState({ x: 0, y: 0 })
  const [previewEnd,  setPreviewEnd]  = useState(null)
  const [ctxMenu, setCtxMenu] = useState(null) // { id, screenX, screenY }
  const [moveMode, setMoveMode] = useState(null) // id del componente in spostamento
  const [selectedIds, setSelectedIds] = useState([]) // selezione multipla
  const [selBox, setSelBox] = useState(null) // { sx, sy, ex, ey } rubber-band in world
  const selBoxStart = useRef(null) // punto di inizio drag selezione
  const [moveMulti, setMoveMulti] = useState(null) // { ids, originX, originY }

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Space key for pan mode
  useEffect(() => {
    const down = e => { if (e.code === 'Space') { e.preventDefault(); setSpaceDown(true) } }
    const up   = e => { if (e.code === 'Space') setSpaceDown(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // ESC cancels drawing / menu / move / selection
  useEffect(() => {
    const h = e => {
      if (e.key === 'Escape') {
        setBeamStart(null); setLineStart(null); setPreviewEnd(null)
        setCtxMenu(null); setMoveMode(null)
        setSelectedIds([]); setSelBox(null); setMoveMulti(null)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        const all = (currentProfile ? currentProfile.components : localComponents)
          .filter(c => c._canvas).map(c => c.id)
        setSelectedIds(all)
        setCtxMenu(null)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [localComponents, currentProfile])

  // Prevent browser default scroll on wheel inside canvas
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const prevent = e => e.preventDefault()
    el.addEventListener('wheel', prevent, { passive: false })
    return () => el.removeEventListener('wheel', prevent)
  }, [])

  // Convert stage pointer position → world coordinates (accounting for pan+zoom)
  const stageToWorld = useCallback((stagePtr) => ({
    x: (stagePtr.x - stagePos.x) / stageScale,
    y: (stagePtr.y - stagePos.y) / stageScale,
  }), [stagePos, stageScale])

  // Components
  const components = currentProfile
    ? currentProfile.components.map(c => {
        const local = localComponents.find(l => l.id === c.id)
        return local ? { ...c, _canvas: local._canvas } : c
      })
    : localComponents

  const visible = (() => {
    const base = detailLevel === 'massing'
      ? components.filter(c => c.category === 'Structure' || c.category === 'Architecture')
      : components
    if (canvasMode === 'struttura') return base.filter(c => c.category === 'Structure')
    if (canvasMode === 'piantina') return base.filter(c => c.category !== 'Structure')
    return base
  })()

  const structureGhost = canvasMode === 'piantina'
    ? components.filter(c => c.category === 'Structure') : []

  const pillars = components.filter(c => c.bim?.ifcClass === 'IfcColumn' && c._canvas)
  const walls   = components.filter(c => c.bim?.ifcClass === 'IfcWall'   && c._canvas)

  // Aggiorna il ref del wall-snap ad ogni render (usato da handleClick senza stale closure)
  doorSnapRef.current = drawingTool === 'door' ? snapToWall(walls, cursorWorld.x, cursorWorld.y) : null

  const findPillarAt = (wx, wy) =>
    pillars.find(p => Math.abs(p._canvas.x - wx) < PILLAR_R * 2.5 / stageScale && Math.abs(p._canvas.y - wy) < PILLAR_R * 2.5 / stageScale)

  // View bounds in world space (for grid rendering)
  const viewBounds = {
    x0: (0 - stagePos.x) / stageScale,
    y0: (0 - stagePos.y) / stageScale,
    x1: (size.w - stagePos.x) / stageScale,
    y1: (size.h - stagePos.y) / stageScale,
  }

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  const handleWheel = useCallback(e => {
    const stage = stageRef.current
    if (!stage) return
    const ptr = stage.getPointerPosition()
    if (!ptr) return

    const dir = e.evt.deltaY < 0 ? 1 : -1
    const newScale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, stageScale * (dir > 0 ? SCALE_STEP : 1 / SCALE_STEP)))

    // Keep the point under cursor fixed
    const wx = (ptr.x - stagePos.x) / stageScale
    const wy = (ptr.y - stagePos.y) / stageScale
    setStagePos({ x: ptr.x - wx * newScale, y: ptr.y - wy * newScale })
    setStageScale(newScale)
  }, [stagePos, stageScale])

  // ── Mouse down: start pan or rubber-band ─────────────────────────────────
  const handleMouseDown = useCallback(e => {
    const isRight = e.evt.button === 2
    const isMid = e.evt.button === 1
    const isSpaceLeft = e.evt.button === 0 && spaceDown
    if (isRight || isMid || isSpaceLeft) {
      e.evt.preventDefault()
      setIsPanning(true)
      panOrigin.current = { mx: e.evt.clientX, my: e.evt.clientY, sx: stagePos.x, sy: stagePos.y }
      return
    }
    // Avvia rubber-band solo in modalità select e su sfondo
    if (e.evt.button === 0 && drawingTool === 'select' && !spaceDown && !moveMode && !moveMulti) {
      const stage = stageRef.current
      if (!stage) return
      const ptr = stage.getPointerPosition()
      if (!ptr) return
      const w = stageToWorld(ptr)
      selBoxStart.current = { x: w.x, y: w.y }
    }
  }, [spaceDown, stagePos, drawingTool, moveMode, moveMulti, stageToWorld])

  // ── Mouse move: pan, rubber-band, or update cursor ───────────────────────
  const handleMouseMove = useCallback(e => {
    if (isPanning && panOrigin.current) {
      const dx = e.evt.clientX - panOrigin.current.mx
      const dy = e.evt.clientY - panOrigin.current.my
      setStagePos({ x: panOrigin.current.sx + dx, y: panOrigin.current.sy + dy })
      return
    }

    const stage = stageRef.current
    if (!stage) return
    const ptr = stage.getPointerPosition()
    if (!ptr) return
    const w = stageToWorld(ptr)
    const wx = snapWorld(w.x), wy = snapWorld(w.y)
    setCursorWorld({ x: wx, y: wy })
    if (beamStart || lineStart) setPreviewEnd({ x: wx, y: wy })

    // Aggiorna rubber-band
    if (selBoxStart.current) {
      setSelBox({ sx: selBoxStart.current.x, sy: selBoxStart.current.y, ex: w.x, ey: w.y })
    }
  }, [isPanning, stageToWorld, beamStart, lineStart])

  // ── Mouse up: end pan o chiudi rubber-band ───────────────────────────────
  const handleMouseUp = useCallback(e => {
    if (isPanning) { setIsPanning(false); panOrigin.current = null; return }

    if (selBoxStart.current && selBox) {
      const minX = Math.min(selBox.sx, selBox.ex)
      const maxX = Math.max(selBox.sx, selBox.ex)
      const minY = Math.min(selBox.sy, selBox.ey)
      const maxY = Math.max(selBox.sy, selBox.ey)
      const inBox = (localComponents.length ? localComponents : (currentProfile?.components ?? []))
        .filter(c => {
          if (!c._canvas) return false
          const cv = c._canvas
          const cx = cv.x ?? (cv.sx + cv.ex) / 2
          const cy = cv.y ?? (cv.sy + cv.ey) / 2
          return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY
        }).map(c => c.id)
      if (inBox.length > 0) setSelectedIds(inBox)
      setSelBox(null)
    }
    selBoxStart.current = null
  }, [isPanning, selBox, localComponents, currentProfile])

  // ── Selezione componente → apre menu contestuale ─────────────────────────
  const handleComponentSelect = useCallback((id, screenX, screenY) => {
    if (moveMode) {
      // in modalità sposta: un click vuoto sposta — qui gestiamo click sul componente
      setMoveMode(null); setCtxMenu(null); setSelectedId(null); return
    }
    setSelectedId(id)
    setCtxMenu({ id, screenX, screenY })
  }, [moveMode, setSelectedId])

  // ── Click sul canvas (sfondo) ─────────────────────────────────────────────
  const handleClick = useCallback(e => {
    if (isPanning) return
    if (e.evt.button !== 0) return

    const stage = stageRef.current
    if (!stage) return
    const ptr = stage.getPointerPosition()
    if (!ptr) return
    const w = stageToWorld(ptr)
    const wx = snapWorld(w.x), wy = snapWorld(w.y)

    // Modalità sposta multipla
    if (moveMulti) {
      moveComponents(moveMulti.ids, wx - moveMulti.originX, wy - moveMulti.originY)
      setMoveMulti(null); setSelectedIds([]); return
    }

    // Modalità sposta: click sul canvas → sposta il componente
    if (moveMode) {
      const comp = localComponents.find(c => c.id === moveMode)
      if (comp) {
        let dx, dy
        if (comp.bim?.ifcClass === 'IfcColumn') { dx = wx - comp._canvas.x; dy = wy - comp._canvas.y }
        else { const cx = (comp._canvas.sx + comp._canvas.ex) / 2; const cy = (comp._canvas.sy + comp._canvas.ey) / 2; dx = wx - cx; dy = wy - cy }
        moveComponent(moveMode, dx, dy)
      }
      setMoveMode(null); setCtxMenu(null); setSelectedId(null); return
    }

    // Chiudi menu se click sul canvas
    if (ctxMenu) { setCtxMenu(null); setSelectedId(null); return }

    if (drawingTool === 'select') { setSelectedId(null); return }
    if (drawingTool === 'pillar')  { addPillar(wx, wy); return }
    if (drawingTool === 'door') {
      const snap = doorSnapRef.current
      if (snap) addDoor(snap.x, snap.y, snap.angle, snap.wallId)
      else addDoor(wx, wy, 0, null)
      return
    }
    if (drawingTool === 'window')  { addWindow(wx, wy); return }
    if (drawingTool === 'footing') { addFooting(wx, wy); return }

    if (drawingTool === 'beam') {
      const hit = findPillarAt(wx, wy)
      if (!beamStart) {
        if (hit) setBeamStart({ id: hit.id, x: hit._canvas.x, y: hit._canvas.y })
      } else {
        if (hit && hit.id !== beamStart.id)
          addBeam(beamStart.id, hit.id, beamStart.x, beamStart.y, hit._canvas.x, hit._canvas.y)
        setBeamStart(null); setPreviewEnd(null)
      }
      return
    }

    if (drawingTool === 'wall') {
      if (!lineStart) { setLineStart({ x: wx, y: wy }) }
      else { addWall(null, lineStart.x, lineStart.y, wx, wy); setLineStart(null); setPreviewEnd(null) }
      return
    }

    if (drawingTool === 'slab') {
      if (!lineStart) { setLineStart({ x: wx, y: wy }) }
      else { addSlab(lineStart.x, lineStart.y, wx, wy); setLineStart(null); setPreviewEnd(null) }
      return
    }

    if (drawingTool === 'stair') {
      if (!lineStart) { setLineStart({ x: wx, y: wy }) }
      else { addStair(lineStart.x, lineStart.y, wx, wy); setLineStart(null); setPreviewEnd(null) }
      return
    }
  }, [isPanning, drawingTool, beamStart, lineStart, stageToWorld, pillars, addPillar, addBeam, addWall, addDoor, addWindow, addSlab, addFooting, addStair, setSelectedId, ctxMenu, moveMode, moveMulti, localComponents, moveComponent, moveComponents])

  // ── Reset view ────────────────────────────────────────────────────────────
  const resetView = useCallback(() => { setStagePos({ x: 60, y: 60 }); setStageScale(1) }, [])

  // ── Cursor style ──────────────────────────────────────────────────────────
  const cursorStyle = isPanning || spaceDown
    ? (isPanning ? 'grabbing' : 'grab')
    : {
        select: 'default', pillar: 'crosshair',
        beam: beamStart ? 'crosshair' : 'cell',
        wall: lineStart ? 'crosshair' : 'cell',
        door: 'crosshair', window: 'crosshair', footing: 'crosshair',
        slab: lineStart ? 'crosshair' : 'cell',
        stair: lineStart ? 'crosshair' : 'cell',
      }[drawingTool] || 'default'

  const wx = cursorWorld.x, wy = cursorWorld.y

  return (
    <div ref={containerRef} onContextMenu={e => e.preventDefault()} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0a1322', cursor: cursorStyle }}>
      {size.w > 0 && size.h > 0 && <Stage
        ref={stageRef}
        width={size.w} height={size.h}
        scaleX={stageScale} scaleY={stageScale}
        x={stagePos.x} y={stagePos.y}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
      >
        <Layer>
          <GridLines viewBounds={viewBounds} scale={stageScale} />

          {/* Ghost struttura in piantina mode */}
          {structureGhost.map(c => (
            <ComponentShape key={'g_' + c.id} component={c} isSelected={false} onSelect={() => {}} stagePos={stagePos} stageScale={stageScale} />
          ))}

          {/* Componenti visibili */}
          {visible.map(c => (
            <ComponentShape key={c.id} component={c} isSelected={selectedId === c.id} onSelect={handleComponentSelect} stagePos={stagePos} stageScale={stageScale} />
          ))}

          {/* Beam preview */}
          {beamStart && previewEnd && (
            <Line points={[beamStart.x, beamStart.y, previewEnd.x, previewEnd.y]}
              stroke='#e67e22' strokeWidth={3 / stageScale} dash={[6, 4]} opacity={0.6} />
          )}
          {beamStart && (
            <Circle x={beamStart.x} y={beamStart.y} radius={(PILLAR_R + 3) / stageScale}
              stroke='#e67e22' strokeWidth={2 / stageScale} fill='transparent' />
          )}

          {/* Wall preview */}
          {(drawingTool === 'wall') && lineStart && previewEnd && (
            <Line points={[lineStart.x, lineStart.y, previewEnd.x, previewEnd.y]}
              stroke='#3498db' strokeWidth={10 / stageScale} dash={[6, 4]} opacity={0.45} />
          )}
          {(drawingTool === 'wall') && lineStart && (
            <Circle x={lineStart.x} y={lineStart.y} radius={6 / stageScale} fill='#3498db' opacity={0.8} />
          )}

          {/* Slab / Stair rect preview */}
          {(drawingTool === 'slab' || drawingTool === 'stair') && lineStart && previewEnd && (
            <Rect
              x={Math.min(lineStart.x, previewEnd.x)} y={Math.min(lineStart.y, previewEnd.y)}
              width={Math.abs(previewEnd.x - lineStart.x)} height={Math.abs(previewEnd.y - lineStart.y)}
              fill={(drawingTool === 'slab' ? '#27ae60' : '#f39c12') + '20'}
              stroke={drawingTool === 'slab' ? '#27ae60' : '#f39c12'}
              strokeWidth={1.5 / stageScale} dash={[6, 4]}
            />
          )}
          {(drawingTool === 'slab' || drawingTool === 'stair') && lineStart && (
            <Circle x={lineStart.x} y={lineStart.y} radius={5 / stageScale}
              fill={drawingTool === 'slab' ? '#27ae60' : '#f39c12'} opacity={0.8} />
          )}

          {/* Cursor ghost for point tools */}
          {drawingTool === 'pillar' && (
            <Rect x={wx - PILLAR_R} y={wy - PILLAR_R} width={PILLAR_R * 2} height={PILLAR_R * 2}
              fill='#e67e2230' stroke='#e67e22' strokeWidth={1 / stageScale} dash={[3, 3]} />
          )}
          {drawingTool === 'door' && doorSnapRef.current && (
            <Group x={doorSnapRef.current.x} y={doorSnapRef.current.y} rotation={doorSnapRef.current.angle} opacity={0.6}>
              <Rect x={-10} y={-4} width={20} height={8}
                fill='#9b59b630' stroke='#9b59b6' strokeWidth={1 / stageScale} dash={[3, 3]} />
              <Arc innerRadius={0} outerRadius={20} angle={90} rotation={0}
                stroke='#9b59b6' strokeWidth={1.2 / stageScale} fill='#9b59b618' />
            </Group>
          )}
          {drawingTool === 'door' && !doorSnapRef.current && (
            <Circle x={wx} y={wy} radius={20 / stageScale} fill='#9b59b615' stroke='#9b59b650' strokeWidth={1 / stageScale} dash={[3, 3]} />
          )}
          {drawingTool === 'window' && (
            <Rect x={wx - 12} y={wy - 4} width={24} height={8} fill='#1abc9c30' stroke='#1abc9c' strokeWidth={1 / stageScale} dash={[3, 3]} />
          )}
          {drawingTool === 'footing' && (
            <Circle x={wx} y={wy} radius={16 / stageScale} fill='#e67e2230' stroke='#e67e22' strokeWidth={1 / stageScale} dash={[4, 3]} />
          )}

          {/* Rubber-band selezione */}
          {selBox && (
            <Rect
              x={Math.min(selBox.sx, selBox.ex)} y={Math.min(selBox.sy, selBox.ey)}
              width={Math.abs(selBox.ex - selBox.sx)} height={Math.abs(selBox.ey - selBox.sy)}
              fill='#3498db18' stroke='#3498db' strokeWidth={1 / stageScale} dash={[4 / stageScale, 3 / stageScale]}
            />
          )}
        </Layer>
      </Stage>}

      {/* HUD — zoom controls top-right */}
      <div style={{ position: 'absolute', top: 8, right: 10, display: 'flex', gap: 4, alignItems: 'center' }}>
        <button onClick={() => { const ns = Math.min(SCALE_MAX, stageScale * SCALE_STEP); setStageScale(ns) }}
          style={zBtn}>+</button>
        <span style={{ fontSize: 10, color: '#405060', minWidth: 36, textAlign: 'center' }}>{Math.round(stageScale * 100)}%</span>
        <button onClick={() => { const ns = Math.max(SCALE_MIN, stageScale / SCALE_STEP); setStageScale(ns) }}
          style={zBtn}>−</button>
        <button onClick={resetView} style={{ ...zBtn, marginLeft: 2, fontSize: 9, padding: '2px 5px' }} title="Reset view">⌂</button>
      </div>

      {/* HUD — coords & hints bottom-left */}
      <div style={{ position: 'absolute', bottom: 8, left: 10, display: 'flex', flexDirection: 'column', gap: 2, pointerEvents: 'none' }}>
        <div style={{ fontSize: 10, color: '#405060' }}>
          {(wx / GRID).toFixed(1)} m, {(wy / GRID).toFixed(1)} m
        </div>
        <div style={{ fontSize: 9, color: '#304050' }}>
          {spaceDown ? '⊕ Trascina per muoverti' : 'Tasto destro + trascina per muoverti · rotella per zoom'}
        </div>
        {beamStart && <div style={{ fontSize: 10, color: '#e67e22' }}>Click su pilastro per chiudere la trave · ESC annulla</div>}
        {drawingTool === 'door' && doorSnapRef.current && <div style={{ fontSize: 10, color: '#9b59b6' }}>Click per posizionare la porta sul muro</div>}
        {drawingTool === 'door' && !doorSnapRef.current && <div style={{ fontSize: 10, color: '#9b59b660' }}>Avvicina il cursore a un muro</div>}
        {drawingTool === 'wall'  && lineStart && <div style={{ fontSize: 10, color: '#3498db' }}>Click per terminare il muro · ESC annulla</div>}
        {drawingTool === 'slab'  && lineStart && <div style={{ fontSize: 10, color: '#27ae60' }}>Click per secondo angolo del solaio · ESC annulla</div>}
        {drawingTool === 'stair' && lineStart && <div style={{ fontSize: 10, color: '#f39c12' }}>Click per secondo angolo della scala · ESC annulla</div>}
        {canvasMode === 'piantina' && !lineStart && <div style={{ fontSize: 9, color: '#3498db50' }}>Struttura portante visibile come riferimento</div>}
      </div>

      {/* Component count bottom-right */}
      <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 10, color: '#2a3a4a', pointerEvents: 'none' }}>
        {visible.length} visibili · {components.length} totali
      </div>

      {/* Barra azioni selezione multipla */}
      {selectedIds.length > 0 && !moveMulti && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: '#0d1b2a', border: '1px solid #3498db',
          borderRadius: 8, padding: '6px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 4px 20px #00000066', zIndex: 50,
        }}>
          <span style={{ fontSize: 12, color: '#3498db', fontWeight: 700 }}>
            {selectedIds.length} selezionati
          </span>
          <div style={{ width: 1, height: 16, background: '#1e3050' }} />
          <button onClick={() => {
            const comps = localComponents.filter(c => selectedIds.includes(c.id) && c._canvas)
            const xs = comps.map(c => c._canvas.x ?? (c._canvas.sx + c._canvas.ex) / 2)
            const ys = comps.map(c => c._canvas.y ?? (c._canvas.sy + c._canvas.ey) / 2)
            const cx = (Math.min(...xs) + Math.max(...xs)) / 2
            const cy = (Math.min(...ys) + Math.max(...ys)) / 2
            setMoveMulti({ ids: selectedIds, originX: cx, originY: cy })
          }} style={{ background: 'none', border: 'none', color: '#e67e22', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ↔ Sposta
          </button>
          <button onClick={() => { deleteComponents(selectedIds); setSelectedIds([]) }}
            style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ✕ Elimina
          </button>
          <button onClick={() => setSelectedIds([])}
            style={{ background: 'none', border: 'none', color: '#607080', fontSize: 12, cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      )}

      {/* Hint sposta multiplo */}
      {moveMulti && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: '#e67e2222', border: '1px solid #e67e22', borderRadius: 8,
          padding: '10px 20px', fontSize: 13, color: '#e67e22', fontWeight: 600,
          pointerEvents: 'none',
        }}>
          Clicca sulla griglia per spostare {moveMulti.ids.length} elementi · ESC annulla
        </div>
      )}

      {/* Menu contestuale */}
      {ctxMenu && (
        <div style={{
          position: 'absolute',
          left: ctxMenu.screenX,
          top: ctxMenu.screenY - 10,
          transform: 'translate(-50%, -100%)',
          background: '#0d1b2a',
          border: '1px solid #1e3050',
          borderRadius: 8,
          boxShadow: '0 6px 24px #00000088',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 50,
          minWidth: 130,
        }}>
          {[
            { label: '✕ Elimina', color: '#e74c3c', action: () => { deleteComponent(ctxMenu.id); setCtxMenu(null) } },
            { label: '↔ Sposta',  color: '#e67e22', action: () => { setMoveMode(ctxMenu.id); setCtxMenu(null) } },
            { label: '⧉ Duplica', color: '#3498db', action: () => { duplicateComponent(ctxMenu.id); setCtxMenu(null); setSelectedId(null) } },
          ].map(({ label, color, action }) => (
            <button key={label} onClick={action} style={{
              padding: '9px 16px', background: 'transparent', border: 'none',
              color, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              textAlign: 'left', transition: 'background 0.1s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1e3050' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >{label}</button>
          ))}
        </div>
      )}

      {/* Hint modalità sposta */}
      {moveMode && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: '#e67e2222', border: '1px solid #e67e22', borderRadius: 8,
          padding: '10px 20px', fontSize: 13, color: '#e67e22', fontWeight: 600,
          pointerEvents: 'none',
        }}>
          Clicca sulla griglia per spostare · ESC annulla
        </div>
      )}
    </div>
  )
}

const zBtn = {
  width: 22, height: 22, borderRadius: 3, border: '1px solid #1e3050',
  background: '#0d1b2a', color: '#607080', cursor: 'pointer', fontSize: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
}
