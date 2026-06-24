# CLAUDE.md — Copilota AI per Progettazione BIM Parametrica

Guida per Claude Code su questo repository.

## Cos'è questo progetto

Copilota AI per progettazione BIM parametrica. L'utente disegna su web (precisione CAD, con
vincoli geometrici) la struttura portante e i muri di un edificio; un'AI interpreta lo spazio e
completa il modello con componenti di dettaglio (porte, finestre, balconi...); il motore geometrico
(Blender headless / Geometry Nodes) genera la mesh 3D; il modello è esportabile in IFC.

Documento di riferimento completo (RF/RNF, ragionamento esteso):
[`docs/requisiti-progetto-stage-bim-ai.md`](docs/requisiti-progetto-stage-bim-ai.md).

## Principi architetturali non negoziabili

1. **L'utente finale non vede mai i Geometry Nodes o Blender.** Solo disegno 2D, property panel,
   chat AI, manipolatori. Blender gira headless lato backend.
2. **Il motore geometrico deve restare sostituibile.** Il backend conosce solo "quale Generator" +
   "quali parametri" — mai dettagli di Blender fuori dal modulo `blender_jobs/`.
3. **Un Component non è un JSON.** È un'entità del kernel con identity, parameters, connectors,
   relationships, constraints, manipulators, geometry (solo riferimento al generatore, **mai la
   mesh**), bim, semantic, actions, events, methods. Il JSON è solo la sua serializzazione.
4. **I vincoli sono relazionali, non posizionali.** Un Connector salva riferimenti tipo "centro
   faccia laterale di Wall_001", mai coordinate assolute. Ogni rigenerazione ricalcola a cascata.
5. **Gerarchia obbligatoria:** Struttura portante → Muri → Componenti. La struttura si disegna per
   prima; nessun muro o componente esiste scollegato dalla struttura.
6. **Il Rule Assistant non ha normative hardcoded.** Le regole sono configurazione esterna
   dichiarativa (JSON), caricata a runtime.
7. **Tre modalità di autonomia AI** fin dal design delle API: Automatica, Assistita, Plan Mode. Il
   kernel espone un'azione "preview/plan" separata dalla creazione diretta.

## Stato implementazione (questo repo)

Il **backend** (`/backend`) è la prima implementazione e copre i principi sopra:

| Modulo | Responsabilità | Principio/RF |
|---|---|---|
| `app/kernel` | `Component` (entità viva), `ComponentDefinition`, `BuildingModel`, registry, eventi, value objects | #3, RF-2.3/2.4 |
| `app/blender_jobs` | Confine del motore geometrico: `GeometryEngine` astratto + `StubHeadlessEngine` (no `bpy`) | #2, RNF-1.1 |
| `app/rules` | Motore di regole generico, regole come JSON esterno (`rules/configs/`) | #6, RF-5.4 |
| `app/ai` | Intent Interpreter, autonomy modes, Plan separato dall'esecuzione | #7, RF-5.1/5.6 |
| `app/api` | FastAPI: profili, set-parameter con cascade, validate, export IFC, AI plan/apply | RF-6.2, RF-7.1 |

`frontend/` e `blender/` sono placeholder: la struttura attesa è documentata ma non ancora
implementata (questo è il repo backend).

## Comandi

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

uvicorn app.main:app --reload          # API su http://localhost:8000 (docs su /docs)
pytest                                  # suite di test del kernel/regole/AI/API
```

## Come estendere

- **Nuovo tipo di componente:** registra una `ComponentDefinition` in
  `app/kernel/registry.py` (o caricala da config) — niente refactoring del kernel (RNF-5.1).
- **Nuovo motore geometrico:** implementa `GeometryEngine` in `app/blender_jobs/` e iniettalo;
  il kernel non cambia (RNF-1.1).
- **Nuova normativa/regola:** aggiungi un file JSON in `app/rules/configs/` e puntaci
  `BIM_DEFAULT_RULESET_PATH` — nessun codice da toccare (RF-5.4).
- **Backend LLM reale per l'AI:** sostituisci `IntentInterpreter.interpret` mantenendo la firma
  `interpret(command, model) -> Plan`.

## Cosa NON fare

- Non salvare mesh nel kernel/DB: solo riferimenti a generatore + parametri.
- Non esporre Geometry Nodes all'utente finale.
- Non scrivere normative edilizie nel codice del Rule Assistant.
- Non creare componenti scollegati dalla struttura portante (eccetto la struttura, `parent: null`).
- Non invertire l'ordine struttura → muri nel workflow.
