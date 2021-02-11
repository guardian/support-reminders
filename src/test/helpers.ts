import {
	OneOffSignup,
	RecurringSignup,
} from '../create-reminder-signup/lambda/models';

export const createOneOffReminder = ({
	identity_id = '0',
	country = 'GB',
	reminder_period = '2021-01-01',
	reminder_created_at = '2021-01-01',
	reminder_platform = 'WEB',
	reminder_component = 'EPIC',
	reminder_stage = 'PRE',
}: Partial<OneOffSignup>): OneOffSignup => ({
	identity_id: identity_id,
	country: country,
	reminder_period: reminder_period,
	reminder_created_at: reminder_created_at,
	reminder_platform: reminder_platform,
	reminder_component: reminder_component,
	reminder_stage: reminder_stage,
});

export const createRecurringReminder = ({
	identity_id = '0',
	country = 'GB',
	reminder_frequency_months = 3,
	reminder_created_at = '2021-01-01',
	reminder_platform = 'WEB',
	reminder_component = 'EPIC',
	reminder_stage = 'PRE',
}: Partial<RecurringSignup>): RecurringSignup => ({
	identity_id: identity_id,
	country: country,
	reminder_frequency_months: reminder_frequency_months,
	reminder_created_at: reminder_created_at,
	reminder_platform: reminder_platform,
	reminder_component: reminder_component,
	reminder_stage: reminder_stage,
});
