import { z } from 'zod'

const envSchema = z.object({
  MISTRAL_API_KEY: z.string().min(1, 'MISTRAL_API_KEY is required'),
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  ELEVENLABS_API_KEY: z.string().min(1, 'ELEVENLABS_API_KEY is required'),
  ELEVENLABS_VOICE_ID: z.string().default('21m00Tcm4TlvDq8ikWAM'),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | undefined

export function getEnv(): Env {
  if (!_env) {
    _env = envSchema.parse(process.env)
  }
  return _env
}

/** @deprecated Use getEnv() instead for lazy validation */
export const env = new Proxy({} as Env, {
  get(_, prop: string) {
    return getEnv()[prop as keyof Env]
  },
})
