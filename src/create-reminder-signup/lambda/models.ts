import * as IR from 'typecheck.macro/dist/IR';
import {
	createDetailedValidator,
	registerType,
} from 'typecheck.macro/dist/typecheck.macro';

// Database model
export interface OneOffSignup {
	identity_id: string;
	reminder_period: string;
	reminder_created_at: string;
	reminder_platform: string;
	reminder_component: string;
	reminder_stage: string;
	reminder_option?: string;
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

export interface OneOffSignupRequest {
	email: Email;
	reminderPeriod: ReminderPeriod;
	reminderPlatform: ReminderPlatform;
	reminderComponent: ReminderComponent;
	reminderStage: ReminderStage;
	reminderOption?: string;
}

export interface APIGatewayEvent {
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
	reminder_period: toDate(request.reminderPeriod),
	reminder_created_at: new Date().toISOString(),
	reminder_platform: request.reminderPlatform,
	reminder_component: request.reminderComponent,
	reminder_stage: request.reminderStage,
	reminder_option: request.reminderOption,
});
