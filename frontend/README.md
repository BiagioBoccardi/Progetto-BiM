# Frontend (placeholder)

Non ancora implementato — questo repository è il **backend**. Struttura attesa (vedi
[`docs/requisiti-progetto-stage-bim-ai.md`](../docs/requisiti-progetto-stage-bim-ai.md) §5):

```
/src
  /drawing      # Smart Drawing Tool: react-konva + Kiwi.js (Cassowary)
  /viewer       # Three.js / react-three-fiber, toggle Massing/Detailed
  /properties   # property panel (sincronizzato con AI e manipolatori — RNF-3.2)
  /ai-chat      # interfaccia conversazionale verso /api/profiles/{id}/ai
```

Contratto col backend: il disegno è serializzato come **lista di Component Instance** (sezione 9)
e inviato a `POST /api/profiles`. L'utente non vede mai Blender né i Geometry Nodes (RNF-3.1).
