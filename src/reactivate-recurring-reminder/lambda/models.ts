import { z } from 'zod';

export const reactivationRequestSchema = z.object({
	reminderCode: z.string(),
});

export type ReactivationRequest = z.infer<typeof reactivationRequestSchema>;
