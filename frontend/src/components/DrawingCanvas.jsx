import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Stage, Layer, Line, Rect, Circle, Text, Group } from 'react-konva'
import useAppStore from '../store/useAppStore.js'

const GRID = 50
const PILLAR_R = 10
const SNAP = GRID
const SCALE_MIN = 0.1
const SCALE_MAX = 8
const SCALE_STEP = 1.12

function snapWorld(v) { return Math.round(v / SNAP) * SNAP }

const COMP_COLOR = { Structure: '#e67e22', Architecture: '#3498db', Detail: '#9b59b6' }

// ─── Component shape ──────────────────────────────────────────────────────────
function ComponentShape({ component, isSelected, onSelect }) {
  const cv = component._canvas
  if (!cv) return null
  const color = COMP_COLOR[component.category] || '#aaa'
  const ifc = component.bim?.ifcClass

  if (ifc === 'IfcColumn') {
    return (
      <Group onClick={() => onSelect(component.id)}>
        <Rect x={cv.x - PILLAR_R} y={cv.y - PILLAR_R} width={PILLAR_R * 2} height={PILLAR_R * 2}
          fill={color} stroke={isSelected ? '#fff' : '#0d1b2a'} strokeWidth={isSelected ? 2 : 1} cornerRadius={2} />
        <Text text={component.id.replace('Pillar_', 'P')} x={cv.x + PILLAR_R + 2} y={cv.y - 5} fontSize={8} fill='#a0aec0' />
      </Group>
    )
  }

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
      <Group onClick={() => onSelect(component.id)}>
        <Line points={pts} closed fill={color} stroke={isSelected ? '#fff' : '#0d1b2a'}
          strokeWidth={isSelected ? 2 : 1} opacity={ifc === 'IfcWall' ? 0.75 : 0.9} />
        <Text text={component.id[0]} x={(sx + ex) / 2 - 3} y={(sy + ey) / 2 - 4} fontSize={8} fill='#fff' opacity={0.6} />
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
    addPillar, addBeam, addWall,
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

  // Drawing state
  const [beamStart,  setBeamStart]  = useState(null)
  const [lineStart,  setLineStart]  = useState(null)
  const [cursorWorld, setCursorWorld] = useState({ x: 0, y: 0 })
  const [previewEnd,  setPreviewEnd]  = useState(null)

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

  // ESC cancels drawing
  useEffect(() => {
    const h = e => {
      if (e.key === 'Escape') { setBeamStart(null); setLineStart(null); setPreviewEnd(null) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

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

  // ── Mouse down: start pan (middle button or space+left) ──────────────────
  const handleMouseDown = useCallback(e => {
    const isMid = e.evt.button === 1
    const isSpaceLeft = e.evt.button === 0 && spaceDown
    if (isMid || isSpaceLeft) {
      e.evt.preventDefault()
      setIsPanning(true)
      panOrigin.current = { mx: e.evt.clientX, my: e.evt.clientY, sx: stagePos.x, sy: stagePos.y }
    }
  }, [spaceDown, stagePos])

  // ── Mouse move: pan or update cursor ─────────────────────────────────────
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
  }, [isPanning, stageToWorld, beamStart, lineStart])

  // ── Mouse up: end pan ────────────────────────────────────────────────────
  const handleMouseUp = useCallback(e => {
    if (isPanning) { setIsPanning(false); panOrigin.current = null }
  }, [isPanning])

  // ── Click: draw tools ────────────────────────────────────────────────────
  const handleClick = useCallback(e => {
    if (isPanning) return
    if (e.evt.button !== 0) return

    const stage = stageRef.current
    if (!stage) return
    const ptr = stage.getPointerPosition()
    if (!ptr) return
    const w = stageToWorld(ptr)
    const wx = snapWorld(w.x), wy = snapWorld(w.y)

    if (drawingTool === 'select') { setSelectedId(null); return }

    if (drawingTool === 'pillar') { addPillar(wx, wy); return }

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
  }, [isPanning, drawingTool, beamStart, lineStart, stageToWorld, pillars, addPillar, addBeam, addWall, setSelectedId])

  // ── Reset view ────────────────────────────────────────────────────────────
  const resetView = useCallback(() => { setStagePos({ x: 60, y: 60 }); setStageScale(1) }, [])

  // ── Cursor style ──────────────────────────────────────────────────────────
  const cursorStyle = isPanning || spaceDown
    ? (isPanning ? 'grabbing' : 'grab')
    : { select: 'default', pillar: 'crosshair', beam: beamStart ? 'crosshair' : 'cell', wall: lineStart ? 'crosshair' : 'cell' }[drawingTool] || 'default'

  const wx = cursorWorld.x, wy = cursorWorld.y

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0a1322', cursor: cursorStyle }}>
      <Stage
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
            <ComponentShape key={'g_' + c.id} component={c} isSelected={false} onSelect={() => {}} />
          ))}

          {/* Componenti visibili */}
          {visible.map(c => (
            <ComponentShape key={c.id} component={c} isSelected={selectedId === c.id} onSelect={setSelectedId} />
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
          {lineStart && previewEnd && (
            <Line points={[lineStart.x, lineStart.y, previewEnd.x, previewEnd.y]}
              stroke='#3498db' strokeWidth={10 / stageScale} dash={[6, 4]} opacity={0.45} />
          )}
          {lineStart && (
            <Circle x={lineStart.x} y={lineStart.y} radius={6 / stageScale} fill='#3498db' opacity={0.8} />
          )}

          {/* Cursor ghost for pillar */}
          {drawingTool === 'pillar' && (
            <Rect x={wx - PILLAR_R} y={wy - PILLAR_R} width={PILLAR_R * 2} height={PILLAR_R * 2}
              fill='#e67e2230' stroke='#e67e22' strokeWidth={1 / stageScale} dash={[3, 3]} />
          )}
        </Layer>
      </Stage>

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
          {spaceDown ? '⊕ Trascina per muoverti' : '⎵ Tieni Spazio + trascina · rotella per zoom'}
        </div>
        {beamStart && <div style={{ fontSize: 10, color: '#e67e22' }}>Click su pilastro per chiudere la trave · ESC annulla</div>}
        {lineStart  && <div style={{ fontSize: 10, color: '#3498db' }}>Click per terminare il muro · ESC annulla</div>}
        {canvasMode === 'piantina' && !lineStart && <div style={{ fontSize: 9, color: '#3498db50' }}>Struttura portante visibile come riferimento</div>}
      </div>

      {/* Component count bottom-right */}
      <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 10, color: '#2a3a4a', pointerEvents: 'none' }}>
        {visible.length} visibili · {components.length} totali
      </div>
    </div>
  )
}

const zBtn = {
  width: 22, height: 22, borderRadius: 3, border: '1px solid #1e3050',
  background: '#0d1b2a', color: '#607080', cursor: 'pointer', fontSize: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
}
