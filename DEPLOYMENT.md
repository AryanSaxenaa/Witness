# WITNESS — Deployment Guide

## Option 1: Vercel (Recommended)

1. Push your repo to GitHub (public)
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. Set environment variables in Vercel dashboard:
   - `MISTRAL_API_KEY`
   - `ELEVENLABS_API_KEY`
   - `ELEVENLABS_VOICE_ID` (optional, defaults to Rachel)
5. Deploy — Vercel auto-detects Next.js

## Option 2: Docker (Self-Hosted)

### Prerequisites
- Docker & Docker Compose installed
- API keys for Mistral and ElevenLabs

### Steps

```bash
# Clone the repository
git clone https://github.com/your-org/witness.git
cd witness

# Create environment file
cp .env.example .env.local
# Edit .env.local with your API keys

# Build and run
docker compose up --build -d

# App is now at http://localhost:3000
```

### Stop
```bash
docker compose down
```

### Rebuild after changes
```bash
docker compose up --build -d
```

## Option 3: Node.js Direct

### Prerequisites
- Node.js 20+
- npm 10+

### Steps

```bash
git clone https://github.com/your-org/witness.git
cd witness

cp .env.example .env.local
# Edit .env.local with your API keys

npm install
npm run build
npm start
```

App runs at http://localhost:3000.

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `MISTRAL_API_KEY` | ✅ | Mistral AI API key for analysis, memo generation, and transcription |
| `ELEVENLABS_API_KEY` | ✅ | ElevenLabs API key for voice synthesis |
| `ELEVENLABS_VOICE_ID` | Optional | Voice ID (default: Rachel `21m00Tcm4TlvDq8ikWAM`) |

## Security Notes

- **No testimony data is stored.** All processing is in-memory only.
- **API keys are server-side only.** They are never sent to the browser.
- **`.env.local` is gitignored.** Never commit API keys.
- The `NEXT_PUBLIC_` prefix is NOT used for any secret values.
