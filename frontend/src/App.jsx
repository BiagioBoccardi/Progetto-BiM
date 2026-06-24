import React, { useEffect } from 'react'
import useAppStore from './store/useAppStore.js'
import ProjectsPage from './pages/ProjectsPage.jsx'
import Toolbar from './components/Toolbar.jsx'
import LeftPanel from './components/LeftPanel.jsx'
import DrawingCanvas from './components/DrawingCanvas.jsx'
import Viewer3D from './components/Viewer3D.jsx'
import PropertyPanel from './components/PropertyPanel.jsx'
import AIPanel from './components/AIPanel.jsx'

const TAB_STYLE = (active) => ({
  padding: '5px 18px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 400,
  background: active ? '#0f3460' : 'transparent',
  color: active ? '#e0e0e0' : '#607080',
  borderBottom: active ? '2px solid #e94560' : '2px solid transparent',
  transition: 'all 0.12s',
})

function Editor() {
  const { viewMode, canvasMode, setCanvasMode } = useAppStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Toolbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Pannello sinistro */}
        <div style={{ width: 230, flexShrink: 0, borderRight: '1px solid #0f3460', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <LeftPanel />
        </div>

        {/* Centro */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {viewMode === '2d' && (
            <div style={{ display: 'flex', background: '#0d1527', borderBottom: '1px solid #0f3460', flexShrink: 0 }}>
              <button style={TAB_STYLE(canvasMode === 'struttura')} onClick={() => setCanvasMode('struttura')}>🏗 Struttura</button>
              <button style={TAB_STYLE(canvasMode === 'piantina')} onClick={() => setCanvasMode('piantina')}>🏠 Piantina</button>
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', alignItems: 'center', paddingRight: 12, fontSize: 10, color: '#304050' }}>
                {canvasMode === 'struttura' ? 'Disegna prima pilastri e travi' : 'Disegna i muri della piantina'}
              </div>
            </div>
          )}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            {viewMode === '2d' ? <DrawingCanvas /> : <Viewer3D />}
          </div>
        </div>

        {/* Pannello destro */}
        <div style={{ width: 260, flexShrink: 0, borderLeft: '1px solid #0f3460', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#12192e' }}>
          <div style={{ flex: '0 0 55%', overflow: 'hidden' }}><PropertyPanel /></div>
          <div style={{ flex: '0 0 45%', overflow: 'hidden' }}><AIPanel /></div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { page, loadProfiles } = useAppStore()
  useEffect(() => { loadProfiles() }, [])
  return page === 'editor' ? <Editor /> : <ProjectsPage />
}
