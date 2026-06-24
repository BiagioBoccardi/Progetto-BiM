# Libreria Generator Blender (placeholder)

Non ancora implementata. Conterrà i **Geometry Node Group** invocati esclusivamente dal modulo
backend `app/blender_jobs/` in modalità headless (`bpy`), mai esposti all'utente (principio #1,
RNF-3.1, RNF-6.1).

```
/generators
  WallGenerator/      # parametri: length, thickness, height
  PillarGenerator/    # parametri: width, depth, height
  BeamGenerator/      # parametri: length, width, height
  WindowGenerator/    # parametri: width, height, sill_height
  DoorGenerator/      # parametri: width, height
  BalconyGenerator/   # parametri: width, depth, railing_height
  ...
```

Ogni Generator è referenziato dal kernel solo per **nome + versione** (`GeometryRef`), mai per
contenuto: il kernel non sa nulla del grafo di nodi (principio #2/#3, RNF-1.1). Il
`StubHeadlessEngine` del backend permette di sviluppare e testare il kernel prima che questi
generatori esistano.
