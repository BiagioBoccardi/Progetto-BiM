# Copilota AI per Progettazione BIM Parametrica
## Documento di sintesi requisiti — Progetto di Stage

**Data:** Giugno 2026
**Stato:** Fase di brainstorming / definizione architettura
**Nota:** Progetto indipendente da altri esami/progetti dello sviluppatore, nessuna sovrapposizione di scadenze.

---

## 1. Visione del prodotto

Una piattaforma web dove l'utente disegna a grandi linee la struttura di un edificio (pareti
maestre, struttura portante) con precisione CAD, e un'AI completa il modello inserendo i
componenti di dettaglio (porte, finestre, balconi, ecc.), generando un modello 3D parametrico
esportabile in formato BIM standard (IFC).

L'utente non interagisce mai direttamente con i nodi di Blender: vede solo un'interfaccia web con
disegno 2D, viewer 3D, pannelli proprietà e chat AI.

---

## 1bis. Riferimento visivo per l'interfaccia (RF-6 — dettaglio)

A titolo di riferimento per il layout e il comportamento dell'interfaccia (RF-6), è stato
analizzato un video dimostrativo di un'app di generative building design ("That Open Company"
platform, basata su tooling web per IFC), che mostra un layout coerente con quanto già definito
nei requisiti.

**Layout a 3 zone:**
- **Sinistra** — albero gerarchico del modello (Building → BuildingStorey → livelli), coerente con
  la struttura IFC di RF-7.1.
- **Centro** — area di visualizzazione, con toggle tra vista 2D (pianta) e vista 3D.
- **Destra** — pannello parametri a slider, organizzato per categorie.

**Pattern di interazione osservati (RF-6.2 / RF-6.3):**
- Selettore di forma base dell'edificio (Rect / L / T / U) come primo parametro.
- Slider numerici con valore visibile e aggiornamento **in tempo reale** della geometria.
- Mix percentuale tra tipologie di unità (Studio / 1BR / 2BR / 3BR) vincolato a somma 100%.
- Modalità di packing/distribuzione (Bays / Tail-fill / Justify).
- **Due livelli di dettaglio geometrico: "Massing" vs "Detailed"** — Massing mostra solo i
  volumi/blocchi; Detailed introduce elementi reali (es. finestre, con "Window-to-Wall ratio").

**Implicazione architetturale**: Massing ≈ output della sola struttura/muri (fasi 1-3 del
workflow), Detailed ≈ output dopo l'intervento dell'AI sui componenti (fase 4). Adottabile come
toggle esplicito nel Viewer (RF-6.1).

---

## 2. Workflow di prodotto (ordine confermato)

```
1. Smart Drawing Tool (web)
   → l'utente disegna PRIMA la struttura portante: pilastri, travi, solai
     con quote precise e vincoli (parallelismo, distanze, allineamenti)
        ↓
2. Su quella struttura, l'utente disegna i muri maestri (perimetro)
   → i muri si vincolano alla struttura, non nel vuoto
        ↓
3. Il profilo (struttura + muri) entra nella pipeline a nodi
   → passato a Blender headless / Geometry Nodes
        ↓
4. AI interpreta lo spazio e riempie i dettagli
   → genera componenti: porte, finestre, balconi, ecc.
   → ogni componente si vincola, a cascata, fino alla struttura (balcone → muro → struttura)
        ↓
5. Utente raffina con parametri o manipolatori grafici
        ↓
6. Rigenerazione parametrica
   → se cambia un parametro a monte (es. interasse pilastri),
     TUTTA la catena vincolata si ricalcola automaticamente
        ↓
7. Output: modello parametrico + export IFC
```

---

## 3. Requisiti Funzionali (RF)

| ID | Area | Descrizione |
|---|---|---|
| RF-1.1 | Disegno 2D vincolato | Disegnare profili 2D con **dimensioni precise** numeriche, non solo a mano libera. |
| RF-1.2 | Disegno 2D vincolato | Supportare **snap** e quotatura live durante il disegno. |
| RF-1.3 | Disegno 2D vincolato | Supportare **vincoli geometrici** nativi: parallelismo, perpendicolarità, distanza fissa, angoli, allineamenti. |
| RF-1.4 | Disegno 2D vincolato | Disegno **prima** della struttura portante, poi dei muri (ordine vincolante). |
| RF-1.5 | Disegno 2D vincolato | Il disegno è **input di una pipeline a nodi**, non azione isolata. |
| RF-2.1 | Generazione parametrica | Libreria di **Generator** (Geometry Nodes) per componenti riutilizzabili. |
| RF-2.2 | Generazione parametrica | Ogni Generator espone **parametri** senza esporre il grafo di nodi. |
| RF-2.3 | Generazione parametrica | Distinguere **Component Definition** (tipo) e **Component Instance** (istanza). |
| RF-2.4 | Generazione parametrica | Ogni Instance mantiene: identity, parameters, connectors, relationships, constraints, manipulators, riferimento al generatore (non la mesh), mapping BIM (IFC), metadata semantico, azioni, eventi. |
| RF-3.1 | Struttura portante | Ogni fabbricato ha struttura esplicita: **solai, travi, pilastri**. |
| RF-3.2 | Struttura portante | Muri e balconi si agganciano, a cascata, alla struttura portante. |
| RF-3.3 | Struttura portante | Gerarchia: **Struttura portante → Muri → Componenti**. |
| RF-4.1 | Vincoli persistenti | Un accoppiamento (porta-muro, balcone-muro) resta valido **dopo la rigenerazione**. |
| RF-4.2 | Vincoli persistenti | I Connector salvano **riferimenti relazionali** (es. "centro faccia laterale di Wall_001"), non coordinate assolute. |
| RF-4.3 | Vincoli persistenti | Una modifica a monte si propaga **a cascata** a valle. |
| RF-5.1 | Assistente AI | *Intent Interpreter*: NL → azioni strutturate sul modello. |
| RF-5.2 | Assistente AI | *Design Assistant*: suggerisce modifiche ai parametri. |
| RF-5.3 | Assistente AI | *Graph Assistant*: naviga le relazioni tra componenti. |
| RF-5.4 | Assistente AI | *Rule Assistant*: verifica regole/normative tramite motore **generico e configurabile**, non hardcoded. |
| RF-5.5 | Assistente AI | Interpretazione semantica dello spazio per decidere quali componenti generare. |
| RF-5.6 | Assistente AI | Tre modalità di autonomia: **Automatica**, **Assistita**, **Plan Mode**. |
| RF-6.1 | Viewer | Viewer 3D web con livelli Massing/Detailed e vista 2D/3D. |
| RF-6.2 | Viewer | Modifica parametri tramite property panel. |
| RF-6.3 | Viewer | Modifica parametri tramite manipolatori grafici, sincronizzati con AI e property panel. |
| RF-7.1 | Interoperabilità BIM | Export **IFC** con mapping esplicito Component → classe IFC. |

---

## 4. Requisiti Non Funzionali (RNF)

| ID | Area | Descrizione |
|---|---|---|
| RNF-1.1 | Disaccoppiamento | Motore geometrico **sostituibile**: il sistema conosce solo "quale generatore" e "quali parametri". |
| RNF-1.2 | Disaccoppiamento | Il Component è **entità del kernel** con stato, comportamento, eventi e relazioni — il JSON è solo serializzazione. |
| RNF-2.1 | Distribuzione | UI **web-based**, nessun CAD/3D lato utente. Blender headless lato backend. |
| RNF-2.2 | Distribuzione | Architettura adatta a futuro SaaS multi-tenant. |
| RNF-3.1 | Usabilità | L'utente non vede mai il grafo di Geometry Nodes. |
| RNF-3.2 | Usabilità | Parametri modificabili in 3 modi sincronizzati: NL, property panel, manipolatori. |
| RNF-4.1 | Performance | Rigenerazione via Blender headless gestita con job asincroni/queue. |
| RNF-4.2 | Performance | Constraint solver client in tempo reale durante il drag. |
| RNF-5.1 | Estendibilità | Libreria Generator da ~10 a ~1000+ componenti senza refactoring del kernel. |
| RNF-5.2 | Estendibilità | Scalare da edifici a infrastrutture/arredi riusando lo stesso Component model. |
| RNF-6.1 | Manutenibilità | Node Editor di Geometry Nodes usato **solo dallo sviluppatore** in prima fase. |

---

## 5. Stack tecnologico

| Layer | Tecnologia |
|---|---|
| Disegno 2D vincolato | React + Konva (react-konva) |
| Constraint solver client | Kiwi.js (Cassowary) |
| Motore geometrico | Blender headless + Geometry Nodes |
| Viewer 3D | Three.js / react-three-fiber |
| Interoperabilità | IFC export |
| Backend | Python + FastAPI |

**Perché Python/FastAPI:** Blender headless si pilota nativamente con `bpy`; l'AI è centrale nel
flusso e chiama direttamente le funzioni del kernel nello stesso processo; SDK LLM Python-first;
FastAPI + Pydantic per il Component Schema tipizzato; monolite con confini interni puliti
(`blender_jobs/` isolato) estraibile in microservizio se servirà.

---

## 6. Stato di avanzamento

- ✅ Architettura concettuale (Generator → Definition → Instance)
- ✅ Component Schema abbozzato
- ✅ Stack tool di disegno (React + Konva + Kiwi.js)
- ✅ Backend (Python + FastAPI)
- 🔄 Esercizio propedeutico Blender (vincolo cubo-cilindro con propagazione)
- ⏳ Dettaglio interpretazione semantica del perimetro
- ⏳ Dettaglio orchestrazione Blender headless

---

## 7. Modalità di autonomia dell'AI (RF-5 — dettaglio)

| Modalità | Comportamento |
|---|---|
| **Automatica** | L'AI genera tutto senza conferma passo-passo; l'utente rivede alla fine. |
| **Assistita** | L'AI propone un elemento alla volta e attende conferma prima di ogni inserimento. |
| **Plan Mode** | L'AI presenta prima un piano completo; l'utente approva in blocco; solo dopo l'AI esegue. |

*Il kernel deve esporre un'azione "preview/plan" separata dalla creazione diretta.*

---

## 9. Formato dati: profilo disegnato → pipeline (esempio)

Il disegno viene serializzato come **lista di Component Instance**, secondo lo stesso Component
Schema. Struttura portante e muri sono già istanze a tutti gli effetti.

```json
{
  "profileId": "profile_2026_06_20_001",
  "components": [
    {
      "id": "Pillar_001",
      "type": "PillarTypeA",
      "category": "Structure",
      "parameters": { "width": 0.3, "depth": 0.3, "height": 3.0 },
      "connectors": {},
      "parent": null,
      "children": ["Beam_001"],
      "constraints": [],
      "geometry": { "generator": "PillarGenerator", "generatorVersion": "1.0" },
      "bim": { "ifcClass": "IfcColumn" },
      "semantic": { "tags": ["structure", "pillar"] }
    },
    {
      "id": "Beam_001",
      "type": "BeamTypeA",
      "category": "Structure",
      "parameters": { "length": 5.0, "width": 0.3, "height": 0.5 },
      "connectors": { "startPillar": "Pillar_001", "endPillar": "Pillar_002" },
      "parent": null,
      "children": ["Wall_001"],
      "constraints": [ { "type": "horizontal" } ],
      "geometry": { "generator": "BeamGenerator", "generatorVersion": "1.0" },
      "bim": { "ifcClass": "IfcBeam" },
      "semantic": { "tags": ["structure", "beam"] }
    },
    {
      "id": "Wall_001",
      "type": "WallTypeA",
      "category": "Architecture",
      "parameters": { "length": 5.0, "thickness": 0.25, "height": 3.0 },
      "connectors": { "hostStructure": "Beam_001" },
      "parent": "Beam_001",
      "children": [],
      "constraints": [ { "type": "attached_to_parent" } ],
      "geometry": { "generator": "WallGenerator", "generatorVersion": "1.0" },
      "bim": { "ifcClass": "IfcWall" },
      "semantic": { "tags": ["wall"] }
    }
  ]
}
```

**Punti chiave:** ogni elemento è un Component Instance completo; gerarchia via `parent`/`children`;
`geometry` solo riferimento al generatore (mai mesh); `constraints` oggetti tipizzati semplici.

---

## 10. Rule Assistant: motore di regole configurabile (RF-5.4 — dettaglio)

Il Rule Assistant non ha normative hardcoded. È un **motore generico e configurabile**: le
normative effettive (NTC italiane, regolamenti locali, ecc.) sono caricate come **configurazione
esterna dichiarativa** (JSON/DSL), non scritte nel codice del kernel.

- Regole in formato dichiarativo separato dal kernel.
- Il kernel espone i dati (dimensioni, distanze, classi IFC, relazioni) perché un set di regole
  esterno li validi, senza che il Rule Assistant sappia a priori quale normativa applica.
- Switch di set di regole = cambio di configurazione (RNF-1.1).
