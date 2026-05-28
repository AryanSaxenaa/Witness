import { z } from 'zod'

const mistralSchema = z.object({
  MISTRAL_API_KEY: z.string().min(1, 'MISTRAL_API_KEY is required'),
})

const elevenLabsSchema = z.object({
  ELEVENLABS_API_KEY: z.string().min(1, 'ELEVENLABS_API_KEY is required'),
  ELEVENLABS_VOICE_ID: z.string().default('21m00Tcm4TlvDq8ikWAM'),
})

type MistralEnv = z.infer<typeof mistralSchema>
type ElevenLabsEnv = z.infer<typeof elevenLabsSchema>

let _mistralEnv: MistralEnv | undefined
let _elevenLabsEnv: ElevenLabsEnv | undefined

export function getMistralEnv(): MistralEnv {
  if (!_mistralEnv) {
    _mistralEnv = mistralSchema.parse(process.env)
  }
  return _mistralEnv
}

export function getElevenLabsEnv(): ElevenLabsEnv {
  if (!_elevenLabsEnv) {
    _elevenLabsEnv = elevenLabsSchema.parse(process.env)
  }
  return _elevenLabsEnv
}

/** @deprecated Use getMistralEnv() or getElevenLabsEnv() instead */
export function getEnv(): MistralEnv & ElevenLabsEnv {
  return {
    ...getMistralEnv(),
    ...getElevenLabsEnv(),
  }
}
