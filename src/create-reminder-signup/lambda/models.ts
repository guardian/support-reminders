import {
	createDetailedValidator,
	registerType,
} from 'typecheck.macro/dist/typecheck.macro';
import { emailIsShortEnoughForIdentity, isValidEmail } from '../../lib/models';

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
export type ReminderPlatform = 'WEB' | 'AMP' | 'MMA' | 'SUPPORT' | 'EMAIL';

export type ReminderComponent =
	| 'EPIC'
	| 'BANNER'
	| 'THANKYOU'
	| 'CANCELLATION'
	| 'EMAIL'
	| 'EDITORIAL_ADS';

export type ReminderStage = 'PRE' | 'POST' | 'WINBACK';

type Email = string;

type DateString = string;

function isValidDateString(dateString: string): boolean {
	const date = Date.parse(dateString);
	return !isNaN(date);
}

export interface BaseSignupRequest {
	email: Email;
	country?: string;
	reminderCreatedAt?: DateString;
	reminderPlatform: ReminderPlatform;
	reminderComponent: ReminderComponent;
	reminderStage: ReminderStage;
	reminderOption?: string;
}

// typecheck.macro doesn't support extends
export type OneOffSignupRequest = BaseSignupRequest & {
	reminderPeriod: DateString;
};

// typecheck.macro doesn't support extends
export type RecurringSignupRequest = BaseSignupRequest & {
	reminderFrequencyMonths: number;
};

// Use macro to generate validator
registerType('OneOffSignupRequest');
export const oneOffSignupValidator = createDetailedValidator<OneOffSignupRequest>(
	undefined,
	{
		constraints: {
			Email: (email: string) =>
				!isValidEmail(email)
					? 'Invalid email address'
					: !emailIsShortEnoughForIdentity(email)
					? 'Email address is too long'
					: null,
			DateString: (dateString: string) =>
				isValidDateString(dateString) ? null : 'Invalid date',
		},
	},
);

registerType('RecurringSignupRequest');
export const recurringSignupValidator = createDetailedValidator<RecurringSignupRequest>(
	undefined,
	{
		constraints: {
			Email: (email: string) =>
				!isValidEmail(email)
					? 'Invalid email address'
					: !emailIsShortEnoughForIdentity(email)
					? 'Email address is too long'
					: null,
			DateString: (dateString: string) =>
				isValidDateString(dateString) ? null : 'Invalid date',
		},
	},
);

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
