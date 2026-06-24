# Copilota AI per Progettazione BIM Parametrica

Piattaforma web dove l'utente disegna la struttura portante e i muri di un edificio con precisione
CAD, e un'AI completa il modello con i componenti di dettaglio (porte, finestre, balconi),
generando un modello 3D parametrico esportabile in **IFC**. Blender gira headless lato backend e non
è mai esposto all'utente.

Requisiti completi: [`docs/requisiti-progetto-stage-bim-ai.md`](docs/requisiti-progetto-stage-bim-ai.md).
Convenzioni e principi architetturali: [`CLAUDE.md`](CLAUDE.md).

## Struttura

```
/backend          # API FastAPI + kernel BIM (implementato)
  /app
    /kernel         # Component (entità viva), Definition, BuildingModel, registry, eventi
    /blender_jobs   # confine del motore geometrico (engine astratto + stub headless)
    /rules          # motore di regole generico, normative come JSON esterno
    /ai             # Intent Interpreter + modalità di autonomia (Automatic/Assisted/Plan)
    /api            # router FastAPI
  /tests
/frontend         # React + react-konva + Kiwi.js (placeholder)
/blender          # libreria Geometry Node Group (placeholder)
/docs             # documento requisiti
```

## Avvio (backend)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# Swagger UI: http://localhost:8000/docs
```

## Test

```bash
cd backend && pytest
```

## Flusso end-to-end (esempio)

1. **Crea un profilo** (struttura + muri, già come lista di Component Instance, sezione 9):

   ```bash
   curl -X POST localhost:8000/api/profiles -H 'content-type: application/json' \
     -d @docs/example_profile.json   # oppure il body della sezione 9
   ```

2. **Modifica un parametro a monte** → rigenerazione a cascata dei discendenti vincolati:

   ```bash
   curl -X PATCH localhost:8000/api/profiles/<id>/components/Beam_001/parameters/length \
     -H 'content-type: application/json' -d '{"value": 8.0}'
   ```

3. **Chiedi all'AI** (Plan Mode: ottieni un piano senza eseguire, poi approva):

   ```bash
   curl -X POST localhost:8000/api/profiles/<id>/ai \
     -H 'content-type: application/json' -d '{"command":"aggiungi un balcone","mode":"plan"}'
   curl -X POST localhost:8000/api/profiles/<id>/ai/apply \
     -H 'content-type: application/json' -d '<plan restituito sopra>'
   ```

4. **Valida** contro un set di regole esterno e **esporta IFC**:

   ```bash
   curl -X POST localhost:8000/api/profiles/<id>/validate
   curl -X POST localhost:8000/api/profiles/<id>/export/ifc
   ```

## Stato

Prima implementazione del backend. Frontend e libreria Blender sono placeholder: la struttura è
documentata, l'implementazione seguirà. Il `StubHeadlessEngine` sostituisce Blender per far girare
kernel/test ovunque; la sostituzione con un motore reale non tocca il kernel (RNF-1.1).
