import * as IR from 'typecheck.macro/dist/IR';
import {
	createDetailedValidator,
	registerType,
} from 'typecheck.macro/dist/typecheck.macro';

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
export type ReminderPlatform = 'WEB' | 'AMP' | 'MMA' | 'SUPPORT';

export type ReminderComponent = 'EPIC' | 'BANNER' | 'THANKYOU' | 'CANCELLATION';

export type ReminderStage = 'PRE' | 'POST' | 'WINBACK';

type Email = string;

function isValidEmail(email: string): boolean {
	const re = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
	return re.test(email.toLowerCase());
}

type ReminderPeriod = string;

function isValidReminderPeriod(reminderPeriod: string): boolean {
	const date = Date.parse(reminderPeriod);
	return !isNaN(date);
}

export interface BaseSignupRequest {
	email: Email;
	country?: string;
	reminderPlatform: ReminderPlatform;
	reminderComponent: ReminderComponent;
	reminderStage: ReminderStage;
	reminderOption?: string;
}

export interface OneOffSignupRequest extends BaseSignupRequest {
	reminderPeriod: ReminderPeriod;
}

export interface RecurringSignupRequest extends BaseSignupRequest {
	reminderFrequencyMonths: number;
}

export interface APIGatewayEvent {
	headers: Record<string, string | undefined>;
	path: string;
	body: string;
}

// Use macro to generate validator
registerType('OneOffSignupRequest');
export const oneOffSignupValidator = createDetailedValidator<OneOffSignupRequest>(
	undefined,
	{
		constraints: {
			Email: (email: string) =>
				isValidEmail(email) ? null : 'Invalid email',
			ReminderPeriod: (reminderPeriod: string) =>
				isValidReminderPeriod(reminderPeriod) ? null : 'Invalid date',
		},
	},
);

registerType('RecurringSignupRequest');
export const recurringSignupValidator = createDetailedValidator<RecurringSignupRequest>(
	undefined,
	{
		constraints: {
			Email: (email: string) =>
				isValidEmail(email) ? null : 'Invalid email',
		},
	},
);

// The type for validation errors in typecheck.macro
export type ValidationErrors = Array<[string, unknown, IR.IR | string]>;

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
	reminder_created_at: new Date().toISOString(),
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
	reminder_created_at: new Date().toISOString(),
	reminder_platform: request.reminderPlatform,
	reminder_component: request.reminderComponent,
	reminder_stage: request.reminderStage,
	reminder_option: request.reminderOption,
});
