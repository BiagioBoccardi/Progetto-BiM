import React, { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import useAppStore from '../store/useAppStore.js'

const SCALE = 1 / 50  // canvas px → metres

const COMP_COLOR = {
  Structure: '#e67e22',
  Architecture: '#3498db',
  Detail: '#9b59b6',
}

function Pillar({ component }) {
  const p = component.parameters
  const cv = component._canvas
  if (!cv) return null
  const x = cv.x * SCALE
  const z = cv.y * SCALE
  const w = p.width || 0.3
  const d = p.depth || 0.3
  const h = p.height || 3
  return (
    <mesh position={[x, h / 2, z]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={COMP_COLOR[component.category]} />
    </mesh>
  )
}

function Beam({ component }) {
  const cv = component._canvas
  if (!cv) return null
  const p = component.parameters
  const sx = cv.sx * SCALE, sz = cv.sy * SCALE
  const ex = cv.ex * SCALE, ez = cv.ey * SCALE
  const mx = (sx + ex) / 2, mz = (sz + ez) / 2
  const len = Math.sqrt((ex - sx) ** 2 + (ez - sz) ** 2)
  const angle = Math.atan2(ez - sz, ex - sx)
  const h = p.height || 0.5
  const yPos = (component.parameters.beamY || 3) - h / 2
  return (
    <mesh position={[mx, yPos, mz]} rotation={[0, -angle, 0]}>
      <boxGeometry args={[len, h, p.width || 0.3]} />
      <meshStandardMaterial color={COMP_COLOR[component.category]} />
    </mesh>
  )
}

function Wall({ component }) {
  const cv = component._canvas
  if (!cv) return null
  const p = component.parameters
  const sx = cv.sx * SCALE, sz = cv.sy * SCALE
  const ex = cv.ex * SCALE, ez = cv.ey * SCALE
  const mx = (sx + ex) / 2, mz = (sz + ez) / 2
  const len = Math.sqrt((ex - sx) ** 2 + (ez - sz) ** 2)
  const angle = Math.atan2(ez - sz, ex - sx)
  const h = p.height || 3
  const thick = p.thickness || 0.25
  return (
    <mesh position={[mx, h / 2, mz]} rotation={[0, -angle, 0]}>
      <boxGeometry args={[len, h, thick]} />
      <meshStandardMaterial color={COMP_COLOR[component.category]} transparent opacity={0.8} />
    </mesh>
  )
}

function ComponentMesh({ component }) {
  const ifc = component.bim?.ifcClass
  if (ifc === 'IfcColumn') return <Pillar component={component} />
  if (ifc === 'IfcBeam') return <Beam component={component} />
  if (ifc === 'IfcWall') return <Wall component={component} />
  return null
}

export default function Viewer3D() {
  const { currentProfile, localComponents, detailLevel } = useAppStore()

  const components = currentProfile ? currentProfile.components.map(c => {
    const lc = localComponents.find(l => l.id === c.id)
    return lc ? { ...c, _canvas: lc._canvas } : c
  }) : localComponents

  const visible = detailLevel === 'massing'
    ? components.filter(c => c.category === 'Structure' || c.category === 'Architecture')
    : components

  return (
    <div style={{ flex: 1, background: '#0a0f1e', position: 'relative' }}>
      <Canvas camera={{ position: [10, 8, 12], fov: 50 }} shadows>
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
        <Environment preset="city" />
        <Grid infiniteGrid fadeDistance={80} cellColor='#1a2a40' sectionColor='#1e3050' />
        {visible.map(c => <ComponentMesh key={c.id} component={c} />)}
        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          panSpeed={1.2}
          zoomSpeed={1.0}
          rotateSpeed={0.8}
          mouseButtons={{ LEFT: 0, MIDDLE: 1, RIGHT: 2 }}
        />
      </Canvas>

      {/* Nav hint overlay */}
      <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 9, color: '#304050', lineHeight: 1.6, pointerEvents: 'none' }}>
        <div>🖱 Sin: ruota &nbsp;|&nbsp; Des/Med: sposta &nbsp;|&nbsp; Rotella: zoom</div>
      </div>

      <div style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 10, color: '#405060', pointerEvents: 'none' }}>
        Vista 3D · {detailLevel === 'massing' ? 'Massing' : 'Detailed'} · {visible.length} elementi
      </div>
    </div>
  )
}
