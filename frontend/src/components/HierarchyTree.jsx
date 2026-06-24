import React, { useState } from 'react'
import useAppStore from '../store/useAppStore.js'

const CATEGORY_COLOR = {
  Structure: '#e67e22',
  Architecture: '#3498db',
  Detail: '#9b59b6',
}

const IFC_ICON = {
  IfcColumn: '■',
  IfcBeam: '━',
  IfcWall: '▭',
  IfcDoor: '🚪',
  IfcWindow: '□',
  IfcSlab: '▬',
}

function TreeNode({ component, depth = 0, components }) {
  const { selectedId, setSelectedId } = useAppStore()
  const [open, setOpen] = useState(true)
  const children = components.filter(c => c.parent === component.id)
  const icon = IFC_ICON[component.bim?.ifcClass] || '◆'
  const color = CATEGORY_COLOR[component.category] || '#a0aec0'
  const isSelected = selectedId === component.id

  return (
    <div>
      <div
        onClick={() => setSelectedId(component.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', paddingLeft: 8 + depth * 14,
          cursor: 'pointer', borderRadius: 3, fontSize: 12,
          background: isSelected ? '#0f3460' : 'transparent',
          color: isSelected ? '#fff' : '#c0cfe0',
          userSelect: 'none',
        }}
      >
        {children.length > 0 && (
          <span onClick={e => { e.stopPropagation(); setOpen(o => !o) }} style={{ fontSize: 10, color: '#a0aec0', minWidth: 10 }}>
            {open ? '▾' : '▸'}
          </span>
        )}
        {children.length === 0 && <span style={{ minWidth: 10 }} />}
        <span style={{ color, fontSize: 11 }}>{icon}</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {component.id}
        </span>
        <span style={{ fontSize: 10, color: '#607080' }}>{component.bim?.ifcClass?.replace('Ifc', '')}</span>
      </div>
      {open && children.map(c => (
        <TreeNode key={c.id} component={c} depth={depth + 1} components={components} />
      ))}
    </div>
  )
}

export default function HierarchyTree() {
  const { currentProfile, localComponents, profileIds, loadProfile } = useAppStore()

  const components = currentProfile
    ? currentProfile.components
    : localComponents

  const roots = components.filter(c => !c.parent || c.parent === null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#a0aec0', letterSpacing: 1, borderBottom: '1px solid #0f3460', flexShrink: 0 }}>
        GERARCHIA
      </div>

      {profileIds.length > 0 && !currentProfile && (
        <div style={{ padding: 8, borderBottom: '1px solid #0f3460', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#a0aec0', marginBottom: 4 }}>Profili salvati:</div>
          {profileIds.map(id => (
            <div key={id}
              onClick={() => loadProfile(id)}
              style={{ fontSize: 11, padding: '2px 6px', cursor: 'pointer', color: '#3498db', hover: 'underline' }}>
              📁 {id}
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {components.length === 0 ? (
          <div style={{ padding: 12, fontSize: 11, color: '#607080', textAlign: 'center' }}>
            <div style={{ marginBottom: 4 }}>Nessun componente</div>
            <div style={{ color: '#405060' }}>Usa gli strumenti sopra per disegnare</div>
          </div>
        ) : (
          roots.map(c => <TreeNode key={c.id} component={c} components={components} />)
        )}
      </div>

      {currentProfile && (
        <div style={{ padding: '6px 10px', borderTop: '1px solid #0f3460', fontSize: 11, color: '#607080', flexShrink: 0 }}>
          {components.length} componenti · {currentProfile.profileId}
        </div>
      )}
    </div>
  )
}
