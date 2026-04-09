# WITNESS — AI-Powered ICC Evidence Preservation Platform
[WITNESS.pdf](https://github.com/user-attachments/files/26179989/WITNESS.pdf)

> **Category: Civic Tool** | **Goal: Improve transparency and engagement**

**WITNESS** is an open-source **civic tool** designed to **improve transparency and engagement** in international justice. It is an AI-driven evidence preservation and pre-analysis platform designed for human rights organizations, independent journalists, and civilians. It accepts audio recordings or written testimonies in **25+ languages**, processes them through a multi-stage AI pipeline, cross-references extracted intelligence against five international databases, and produces a structured evidentiary memo formatted to International Criminal Court standards.

## Why is this project needed?

In conflict zones and under authoritarian regimes, crucial evidence of human rights violations is often lost, destroyed, or recorded in formats that are difficult to verify and process. Human rights defenders and ordinary civilians risk their lives to document atrocities, yet their testimonies frequently fail to meet the rigorous corroboration and formatting standards required by international justice mechanisms like the International Criminal Court (ICC). **WITNESS** bridges this gap. By functioning as a secure, accessible **civic tool**, it empowers anyone to securely preserve evidence and automatically structure it into actionable intelligence. This dramatically improves global transparency and civic engagement by transforming raw field testimonies into robust, cross-referenced documentation, ensuring that the voices of victims are preserved and perpetrators are held accountable.

## Demo

- **Local Demo:** Run the application locally and click the "Load Demo Testimony" button to evaluate the pipeline with an example witness account.
- **Live Demo Link:** [https://witness-xi.vercel.app/]
- **Demo Video:** [https://youtu.be/3yVHgSayMQ4?si=JL4oKXFS0kiOXpmE]

---

## Disclaimer

**WITNESS generates pre-analysis memos only.** Outputs are not legal documents, are not admissible as evidence, and do not constitute legal advice. All outputs must be reviewed by qualified legal counsel before use in any proceeding. Confidence scores are algorithmically derived approximations and are capped below 100% by design.

---

## Table of Contents

- [Core Features](#core-features)
- [Architecture](#architecture)
- [Pipeline](#pipeline)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Ethical Design](#ethical-design)
- [License](#license)

---

## Core Features

### Multi-Language Evidence Intake
- Accepts audio files (MP3, WAV, M4A, WebM, OGG) or direct text input
- Real-time speech-to-text via browser microphone with automatic language detection
- Supports **25+ languages** including Arabic, Ukrainian, Tigrinya, Swahili, Pashto, and Burmese
- Built-in demo testimony for immediate evaluation

### AI-Powered Analysis Pipeline
- **Transcription**: Mistral Voxtral (voxtral-mini-latest) with word-level timestamps and language identification
- **Entity Extraction**: Mistral Large identifies persons, locations, organizations, dates, incidents, military identifiers, and SIGINT references
- **Translation**: Automatic translation to English with original text preservation
- **Legal Annotation**: Key phrases annotated with evidentiary significance and ICC legal relevance

### Five-Database Cross-Referencing Engine
- **ICC Case Registry** — Matches against International Criminal Court case data, perpetrators, and locations
- **UN Incident Database** — Cross-references UN-documented incidents with date proximity matching (+/- 7 days)
- **ACLED Armed Conflict Events** — Matches against the Armed Conflict Location and Event Data project records
- **Amnesty International Reports** — Correlates findings with Amnesty International human rights documentation
- **Human Rights Watch Reports** — Validates against HRW-documented violations and perpetrator records
- Supports exact match, fuzzy match (Levenshtein distance), and date proximity matching
- Automatic deduplication retaining highest-confidence matches per entity-case pair

### Structured ICC Memo Generation
- Produces evidentiary pre-analysis memos with: executive summary, entity map, corroboration analysis, veracity scoring, flagged inconsistencies, and recommended follow-up actions
- Case reference numbers generated automatically
- Formatted to ICC documentation standards

### Export and Dissemination
- **PDF Export** — Structured memo rendered as a downloadable PDF document
- **JSON Export** — Raw memo data for programmatic consumption
- **Evidence Package Export** — Complete bundle containing memo, analysis results, cross-references, transcription, and full chain-of-custody audit trail
- **Audio Readout** — ElevenLabs voice synthesis of the executive summary

### Chain-of-Custody Audit Log
- Every pipeline step is automatically timestamped and logged
- Tracks: step transitions, data ingestion, model invocations, and result generation
- Viewable audit trail panel on the results page
- Included in evidence package exports for evidentiary integrity

### Side-by-Side Testimony Comparison
- Compare two completed sessions in a split-pane view
- Highlights common and unique extracted entities across testimonies
- Useful for cross-referencing multiple witness accounts of the same incident

### Case File Organization
- Group related analysis sessions under named case files
- Assign/unassign sessions to case files from the history dashboard
- Enables structured investigation of multi-witness or multi-incident cases

### Session Persistence and Case History
- Completed analyses are automatically saved to browser local storage (up to 50 sessions)
- Full session history dashboard with search, confidence indicators, and match counts
- Sessions can be reopened or deleted at any time

### PII Redaction
- One-click redaction of personally identifiable information in transcripts and analysis
- Uses entity annotations (PERSON, MILITARY_ID, SIGINT) for targeted redaction
- Regex fallback for emails, phone numbers, IDs, and GPS coordinates
- Preserves evidentiary structure while protecting witness identities

### Confidence Threshold Filtering
- Cross-reference results can be filtered by minimum corroboration strength
- Preset thresholds: All, 30%+, 50%+, 70%+
- Enables analysts to focus on high-confidence matches during review

### Security and Reliability
- Per-IP API rate limiting (sliding window token bucket) on all endpoints
- Input size validation (100,000 character maximum on analysis endpoint)
- Audio file size limit (25MB maximum on uploads)
- Client-side retry with exponential backoff and jitter on all API calls
- Supports AbortController cancellation of in-flight pipeline
- Respects server Retry-After headers

### Interface
- Dark mode (default) and light mode with persistent preference
- Responsive four-stage pipeline navigation rail with real-time progress indication
- Entity-annotated transcript view with color-coded inline highlights
- Accessible: ARIA labels, semantic HTML landmarks, keyboard-navigable controls

---

## Architecture

```
Client (Next.js App Router)
    |
  |-- /api/transcribe       -->  Mistral Voxtral (voxtral-mini-latest)
  |-- /api/analyze           -->  Mistral Large (entity extraction, translation, annotation)
  |-- /api/analyze-stream    -->  Mistral Large (SSE streaming analysis)
  |-- /api/crossreference    -->  Local five-database matching engine
  |-- /api/memo              -->  Mistral Large (ICC memo generation)
  |-- /api/memo-stream       -->  Mistral Large (SSE streaming memo generation)
  |-- /api/voice             -->  ElevenLabs Multilingual v2
  |-- /api/demo              -->  Static demo testimony
    |
    +-- Zustand Store (session state, audit log, case files, persistence)
```

All AI inference runs server-side via Next.js API routes. Analysis and memo generation support SSE (Server-Sent Events) streaming for real-time preview. No testimony data is persisted on the server. Cross-referencing is performed entirely in-memory against bundled datasets.

---

## Pipeline

| Stage | Process | Model / Engine |
|-------|---------|----------------|
| 1. Ingest | Accept audio file, text input, or microphone recording | Browser MediaRecorder / File API |
| 2. Transcribe | Generate timestamped transcript with language detection | Mistral Voxtral (voxtral-mini-latest) |
| 3. Analyze | Extract entities, translate, annotate legal significance (streaming SSE) | Mistral Large |
| 4. Cross-Reference | Match entities against ICC, UN, ACLED, Amnesty, HRW databases | Custom fuzzy matching engine |
| 5. Generate Memo | Produce structured evidentiary pre-analysis memo (streaming SSE) | Mistral Large |
| 6. Export | PDF, JSON, evidence package, or audio readout | @react-pdf/renderer, ElevenLabs |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16, React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, dark/light theme system |
| State Management | Zustand 5 with localStorage persistence |
| AI — Analysis | Mistral Large (mistral-large-latest) |
| AI — Transcription | Mistral Voxtral (voxtral-mini-latest) |
| AI — Voice | ElevenLabs Multilingual v2 |
| Rich Text Editor | TipTap |
| PDF Generation | @react-pdf/renderer |
| Charts | Recharts |
| PII Redaction | Custom regex + entity-based redaction |
| Validation | Zod |
| Testing | Vitest |
| Streaming | SSE (Server-Sent Events) |

---

## Quick Start

```bash
git clone https://github.com/AryanSaxenaa/Witness.git
cd Witness
cp .env.example .env.local    # Add your API keys
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MISTRAL_API_KEY` | Yes | Mistral AI API key for analysis, memo generation, and transcription |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs API key for voice synthesis |
| `ELEVENLABS_VOICE_ID` | No | ElevenLabs voice ID (defaults to Rachel `21m00Tcm4TlvDq8ikWAM`) |

---

## Testing

```bash
npm test           # Run all tests once
npm run test:watch # Run tests in watch mode
```

Test coverage includes:
- Rate limiter (token bucket behavior, refill, rejection)
- Retry mechanism (exponential backoff, status code handling, network errors)
- Cross-reference engine (exact/fuzzy matching, deduplication, score capping)
- Zod schema validation (all API input/output schemas)

---

## Project Structure

```
Witness/
  app/
    page.tsx                 # Main evidence intake page with pipeline orchestration
    layout.tsx               # Root layout with theme support
    results/page.tsx         # Analysis results and memo display with audit log
    history/page.tsx         # Session history dashboard with case file management
    compare/page.tsx         # Side-by-side testimony comparison
    api/
      analyze/route.ts       # Entity extraction and translation
      analyze-stream/route.ts # SSE streaming entity extraction
      transcribe/route.ts    # Audio transcription
      crossreference/route.ts # Five-database matching
      memo/route.ts          # ICC memo generation
      memo-stream/route.ts   # SSE streaming memo generation
      voice/route.ts         # Voice synthesis
      demo/route.ts          # Demo testimony loader
  components/
    theme-toggle.tsx         # Dark/light mode switch
    speech-input.tsx         # Microphone recording (Voxtral or browser STT)
    upload-zone.tsx          # Audio file drag-and-drop
    testimony-editor.tsx     # TipTap rich text editor
    processing-progress.tsx  # Pipeline progress indicator
    skeleton-loader.tsx      # Animated skeleton loading states
    stream-preview.tsx       # Live SSE streaming text display
    page-transition.tsx      # CSS-based page entrance animation
    memo-display.tsx         # Tabbed memo viewer
    entity-table.tsx         # Extracted entity display
    entity-graph.tsx         # SVG entity relationship graph
    cross-ref-table.tsx      # Cross-reference results with threshold filtering
    confidence-chart.tsx     # Radial veracity score chart
    pdf-template.tsx         # PDF document template
    disclaimer-banner.tsx    # Persistent legal disclaimer
    error-boundary.tsx       # React error boundary
  lib/
    mistral.ts               # Mistral AI client (analysis, memo, streaming)
    voxtral.ts               # Mistral Voxtral client (transcription)
    elevenlabs.ts            # ElevenLabs client
    crossreference.ts        # Five-database matching engine
    rate-limit.ts            # Per-IP token bucket rate limiter
    retry.ts                 # Fetch with exponential backoff and jitter
    schemas.ts               # Zod validation schemas
    utils.ts                 # Shared utilities (cn, formatting, case refs)
    env.ts                   # Environment variable validation
    redact.ts                # PII redaction utility
    stream-client.ts         # SSE stream consumer for client-side
  store/
    session.ts               # Zustand store with persistence, audit log, and case files
  data/
    icc.json                 # ICC case registry
    un-incidents.json        # UN incident database
    acled-events.json        # ACLED armed conflict events
    hr-reports.json          # Amnesty International and HRW reports
    demo-testimony.txt       # Demo testimony text for quick evaluation
  types/
    index.ts                 # All TypeScript interfaces
  __tests__/
    rate-limit.test.ts       # Rate limiter tests
    retry.test.ts            # Retry mechanism tests
    crossreference.test.ts   # Cross-reference engine tests
    schemas.test.ts          # Schema validation tests
```

---

## Ethical Design

WITNESS is engineered as a **pre-analysis assistive tool**, not a replacement for human legal expertise.

- **No server-side data retention.** Testimony data is processed in-memory and never persisted on the server.
- **No certainty claims.** All confidence and veracity scores are algorithmically capped below 100%.
- **Built-in PII redaction.** One-click redaction of personally identifiable information to protect witness identities.
- **Persistent disclaimer.** A non-dismissible legal disclaimer is displayed on every page and embedded in every exported document.
- **Human review mandate.** All outputs explicitly recommend review by qualified legal counsel.
- **Transparent sourcing.** Cross-referencing uses only publicly available ICC, UN, ACLED, Amnesty International, and Human Rights Watch data.
- **Auditable processing.** Every pipeline step is logged with timestamps for chain-of-custody verification.

---

## License

MIT
