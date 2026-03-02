# WITNESS — AI-Powered Evidence Preservation

WITNESS is an AI-powered evidence preservation tool for human rights organizations. It accepts audio or text testimonies in any language, runs them through a multi-step AI pipeline (Whisper + Mistral Large), cross-references findings against ICC and UN databases, and outputs a structured evidentiary pre-analysis memo formatted to ICC standards.

Built for **Sudo Make World (Civic Track)** + **Mistral Worldwide Hackathon** — March 2026.

## ⚠️ Disclaimer

**WITNESS AI generates pre-analysis memos only.** This output is not a legal document, is not admissible as evidence, and is not a substitute for qualified legal counsel. All outputs must be reviewed by a trained human analyst before use in any legal proceeding.

## Live Demo

[Vercel URL — coming soon]

## Quick Start

```bash
git clone https://github.com/your-org/witness.git
cd witness
cp .env.example .env.local    # Fill in your API keys
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MISTRAL_API_KEY` | ✅ | Mistral AI API key |
| `GROQ_API_KEY` | ✅ | Groq API key (Whisper transcription) |
| `ELEVENLABS_API_KEY` | ✅ | ElevenLabs API key (voice) |
| `ELEVENLABS_VOICE_ID` | Optional | ElevenLabs voice ID (defaults to Rachel) |
| `NEXT_PUBLIC_APP_URL` | Optional | App URL (defaults to localhost:3000) |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| State | Zustand |
| AI Analysis | Mistral Large (mistral-large-latest) |
| Transcription | Groq Whisper large-v3 (free, ultra-fast) |
| Voice | ElevenLabs Multilingual v2 |
| PDF Export | @react-pdf/renderer |
| Charts | Recharts |
| Validation | Zod |

## Pipeline Overview

1. 🎙️ **Ingest** — Upload audio or paste text testimony
2. 🔍 **Transcribe** — Groq Whisper large-v3 with language detection & timestamps
3. ⚖️ **Analyze** — Mistral Large extracts entities, translates, annotates legal significance
4. 🔗 **Cross-Reference** — Fuzzy-match against ICC case registry & UN incident database
5. 📋 **Generate Memo** — Evidentiary pre-analysis memo formatted to ICC standards
6. 📄 **Export** — PDF package + optional ElevenLabs audio readout

## Ethical Statement

WITNESS is designed as a **pre-analysis assistive tool**, not a replacement for human legal expertise. The system:

- Never stores testimony data (in-memory processing only)
- Never claims certainty — confidence scores are capped below 100%
- Always displays a non-dismissible disclaimer on every page and PDF
- Recommends human review for all outputs
- Uses only publicly available ICC and UN data for cross-referencing

This tool is intended to assist trained human analysts, not replace them.

## License

MIT
