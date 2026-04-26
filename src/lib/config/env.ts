import { z } from 'zod';
import type { InferenceProviderConfig } from '@/lib/ai/client';

const envSchema = z.object({
  MODEL_PROVIDER: z.enum(['openrouter', 'bedrock']).default('openrouter'),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  SESSION_SECRET: z.string().min(1),
  TOKEN_PEPPER: z.string().min(1),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  BEDROCK_REGION: z.string().optional(),
  BEDROCK_MODEL_ID: z.string().optional(),
});

export const env = envSchema.parse({
  MODEL_PROVIDER: process.env.MODEL_PROVIDER,
  APP_BASE_URL: process.env.APP_BASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  TOKEN_PEPPER: process.env.TOKEN_PEPPER,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
  BEDROCK_REGION: process.env.BEDROCK_REGION,
  BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID,
});

/**
 * Converts environment variables into the app-owned provider config shape.
 * OpenRouter is the first implementation target; Bedrock remains a later adapter
 * behind the same InferenceClient interface.
 */
export function getInferenceProviderConfig(): InferenceProviderConfig {
  if (env.MODEL_PROVIDER === 'bedrock') {
    return {
      provider: 'bedrock',
      region: env.BEDROCK_REGION,
      modelId: env.BEDROCK_MODEL_ID,
    };
  }

  return {
    provider: 'openrouter',
    apiKey: env.OPENROUTER_API_KEY,
    model: env.OPENROUTER_MODEL || 'anthropic/claude-3.7-sonnet',
    appName: 'interactive-business-card',
  };
}
