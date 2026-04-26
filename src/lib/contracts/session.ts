import { z } from 'zod';

export const createSessionRequestSchema = z.object({
  token: z.string().min(1),
});

export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;
