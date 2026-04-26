import { z } from 'zod';

export const sendChatRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
});

export type SendChatRequest = z.infer<typeof sendChatRequestSchema>;
