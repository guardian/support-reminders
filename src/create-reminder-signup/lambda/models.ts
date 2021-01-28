import {createDetailedValidator, registerType} from "typecheck.macro/dist/typecheck.macro";

export type ReminderPlatform =
	'WEB' |
	'AMP' |
	'MMA' |
	'SUPPORT';

export type ReminderComponent =
	'EPIC' |
	'BANNER' |
	'THANKYOU' |
	'CANCELLATION';

export type ReminderStage =
	'PRE' |
	'POST' |
	'WINBACK';

export interface OneOffSignup {
	email: string;
	reminderPeriod: string;
	reminderPlatform: ReminderPlatform;
	reminderComponent: ReminderComponent;
	reminderStage: ReminderStage;
	reminderOption?: string;
}

export interface APIGatewayEvent {
	body: string;
}

// Use macro to generate validator
registerType('OneOffSignup');
export const oneOffSignupValidator = createDetailedValidator<OneOffSignup>();
