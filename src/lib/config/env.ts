import { z } from 'zod';

const envSchema = z.object({
  MODEL_PROVIDER: z.enum(['openrouter', 'bedrock', 'ollama']).default('openrouter'),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  SESSION_SECRET: z.string().min(1),
  TOKEN_PEPPER: z.string().min(1),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  BEDROCK_REGION: z.string().optional(),
  BEDROCK_MODEL_ID: z.string().optional(),
  OLLAMA_BASE_URL: z.string().optional(),
  OLLAMA_MODEL: z.string().optional(),
  SESSION_TABLE_NAME: z.string().optional(),
  TOKEN_TABLE_NAME: z.string().optional(),
  SESSION_TTL_HOURS: z.string().optional(),
  ORIGIN_VERIFY_HEADER: z.string().optional(),
  ORIGIN_VERIFY_TOKEN: z.string().optional(),
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
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
  OLLAMA_MODEL: process.env.OLLAMA_MODEL,
  SESSION_TABLE_NAME: process.env.SESSION_TABLE_NAME,
  TOKEN_TABLE_NAME: process.env.TOKEN_TABLE_NAME,
  SESSION_TTL_HOURS: process.env.SESSION_TTL_HOURS,
  ORIGIN_VERIFY_HEADER: process.env.ORIGIN_VERIFY_HEADER,
  ORIGIN_VERIFY_TOKEN: process.env.ORIGIN_VERIFY_TOKEN,
});
