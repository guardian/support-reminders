import * as Joi from 'joi';

export enum ReminderPlatform {
	WEB = 'WEB',
	AMP = 'AMP',
	MMA = 'MMA',
	SUPPORT = 'SUPPORT',
}

export enum ReminderComponent {
	EPIC = 'EPIC',
	BANNER = 'BANNER',
	THANKYOU = 'THANKYOU',
	CANCELLATION = 'CANCELLATION',
}

export enum ReminderStage {
	PRE = 'PRE',
	POST = 'POST',
	WINBACK = 'WINBACK',
}

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

export const schema = Joi.object({
	email: Joi.string().email().required(),
	reminderPeriod: Joi.date().required(),
	reminderPlatform: Joi.string()
		.valid(...Object.keys(ReminderPlatform))
		.required(),
	reminderComponent: Joi.string()
		.valid(...Object.keys(ReminderComponent))
		.required(),
	reminderStage: Joi.string()
		.valid(...Object.keys(ReminderStage))
		.required(),
	reminderOption: Joi.string(),
});
