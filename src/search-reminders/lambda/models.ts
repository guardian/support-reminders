import {
	createDetailedValidator,
	registerType,
} from 'typecheck.macro/dist/typecheck.macro';
import { OneOffSignup } from '../../create-reminder-signup/lambda/models';

export interface SearchRequest {
	identityId: string;
}

registerType('SearchRequest');
export const searchValidator = createDetailedValidator<SearchRequest>();

export interface OneOffReminder {
	type: 'ONE_OFF';
	period: string;
	createdAt: string;
	cancelledAt: string;
}

export interface OneOffQueryRow {
	reminder_period: string;
	reminder_created_at: string;
	reminder_cancelled_at: string;
}

export function oneOffReminderFromQueryRow(
	row: OneOffQueryRow,
): OneOffReminder {
	return {
		type: 'ONE_OFF',
		period: row.reminder_period,
		createdAt: row.reminder_created_at,
		cancelledAt: row.reminder_cancelled_at,
	};
}
