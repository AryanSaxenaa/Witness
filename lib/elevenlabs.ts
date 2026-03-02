import { getEnv } from '@/lib/env'

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'

export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const e = getEnv()
  const response = await fetch(
    `${ELEVENLABS_BASE}/text-to-speech/${e.ELEVENLABS_VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': e.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs API error: ${response.status} — ${error}`)
  }

  return response.arrayBuffer()
}
