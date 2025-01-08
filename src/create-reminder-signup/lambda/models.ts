import { z } from 'zod';

// Database model
export interface BaseSignup {
	identity_id: string;
	country?: string;
	reminder_created_at: string;
	reminder_platform: string;
	reminder_component: string;
	reminder_stage: string;
	reminder_option?: string;
}
export interface OneOffSignup extends BaseSignup {
	reminder_period: string;
}
export interface RecurringSignup extends BaseSignup {
	reminder_frequency_months: number;
}

// API request models
const reminderPlatformSchema = z.union([
	z.literal('WEB'),
	z.literal('AMP'),
	z.literal('MMA'),
	z.literal('SUPPORT'),
	z.literal('EMAIL'),
]);

const reminderComponentSchema = z.union([
	z.literal('EPIC'),
	z.literal('BANNER'),
	z.literal('THANKYOU'),
	z.literal('CANCELLATION'),
	z.literal('EMAIL'),
	z.literal('EDITORIAL_ADS'),
	z.literal('REMINDER'),
	z.literal('MOMENT'),
	z.literal('SINGLE_MONTHLY'),
	z.literal('IN_LIFE_JOURNEY'),
]);

const reminderStageSchema = z.union([
	z.literal('PRE'),
	z.literal('POST'),
	z.literal('WINBACK'),
]);
export type ReminderStage = 'PRE' | 'POST' | 'WINBACK';

export const baseSignupRequestSchema = z.object({
	email: z
		.string()
		// Identity’s guest creation endpoint errors if the provided email address is more than 100 characters long
		.max(100)
		// The API gateway -> SQS integration encodes + as a space in the email string
		.transform((email) => email.replace(' ', '+'))
		.pipe(z.string().email()),
	country: z.string().optional(),
	reminderCreatedAt: z.string().datetime().optional(),
	reminderPlatform: reminderPlatformSchema,
	reminderComponent: reminderComponentSchema,
	reminderStage: reminderStageSchema,
	reminderOption: z.string().optional(),
});
export type BaseSignupRequest = z.infer<typeof baseSignupRequestSchema>;

export const oneOffSignupRequestSchema = baseSignupRequestSchema.extend({
	reminderPeriod: z.string().date(),
});
export type OneOffSignupRequest = z.infer<typeof oneOffSignupRequestSchema>;

export const recurringSignupRequestSchema = baseSignupRequestSchema.extend({
	reminderFrequencyMonths: z.number(),
});
export type RecurringSignupRequest = z.infer<
	typeof recurringSignupRequestSchema
>;

const toDate = (s: string): string => {
	const d = new Date(s);
	d.setDate(1);
	return d.toISOString().slice(0, 10);
};

export const oneOffSignupFromRequest = (
	identityId: string,
	request: OneOffSignupRequest,
): OneOffSignup => ({
	identity_id: identityId,
	country: request.country,
	reminder_period: toDate(request.reminderPeriod),
	reminder_created_at: (request.reminderCreatedAt
		? new Date(request.reminderCreatedAt)
		: new Date()
	).toISOString(),
	reminder_platform: request.reminderPlatform,
	reminder_component: request.reminderComponent,
	reminder_stage: request.reminderStage,
	reminder_option: request.reminderOption,
});

export const recurringSignupFromRequest = (
	identityId: string,
	request: RecurringSignupRequest,
): RecurringSignup => ({
	identity_id: identityId,
	country: request.country,
	reminder_frequency_months: request.reminderFrequencyMonths,
	reminder_created_at: (request.reminderCreatedAt
		? new Date(request.reminderCreatedAt)
		: new Date()
	).toISOString(),
	reminder_platform: request.reminderPlatform,
	reminder_component: request.reminderComponent,
	reminder_stage: request.reminderStage,
	reminder_option: request.reminderOption,
});
