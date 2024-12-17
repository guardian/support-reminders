import { z } from 'zod';

export const cancellationRequestSchema = z.object({
	reminderCode: z.string(),
});

type CancellationRequest = z.infer<typeof cancellationRequestSchema>;
