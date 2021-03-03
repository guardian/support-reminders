import {
	writeOneOffSignup,
	writeRecurringSignup,
} from '../../create-reminder-signup/lib/db';
import { createDatabaseConnectionPool } from '../../lib/db';
import {
	createOneOffReminder,
	createRecurringReminder,
} from '../../test/helpers';
import { config } from '../../test/setup';
import { cancelPendingSignups } from './db';
import {OneOffSignup, RecurringSignup} from "../../create-reminder-signup/lambda/models";

const pool = createDatabaseConnectionPool(config);

afterAll(() => {
	const cleanUpDatabase = async () => {
		await pool.end();
	};

	return cleanUpDatabase();
});

const writeOneOffReminderAndGetCode = async (signup: OneOffSignup): Promise<string> => {
	const result = await writeOneOffSignup(signup, pool);
	return result.rows[0].reminder_code;
};
const writeRecurringReminderAndGetCode = async (signup: RecurringSignup): Promise<string> => {
	const result = await writeRecurringSignup(signup, pool);
	return result.rows[0].reminder_code;
};

describe('cancelPendingReminders', () => {
	it('cancels all pending one-off reminders', async () => {
		expect.assertions(1);

		const identityId = '0';
		const r1 = createOneOffReminder({
			identity_id: identityId,
			reminder_period: '2021-01-01',
		});
		const r2 = createOneOffReminder({
			identity_id: identityId,
			reminder_period: '2021-02-01',
		});
		const reminderCode = await writeOneOffReminderAndGetCode(r1);
		await writeOneOffSignup(r2, pool);


		const cancelledReminders = await cancelPendingSignups(
			reminderCode,
			pool,
		);

		expect(cancelledReminders).toBe(2);
	});

	it('doesnt cancel reminders that have already been cancelled', async () => {
		expect.assertions(1);

		const identityId = '0';
		const r1 = createOneOffReminder({
			identity_id: identityId,
			reminder_period: '2021-01-01',
		});
		const reminderCode = await writeOneOffReminderAndGetCode(r1);
		await cancelPendingSignups(reminderCode, pool);

		const r2 = createOneOffReminder({
			identity_id: identityId,
			reminder_period: '2021-02-01',
		});
		await writeOneOffSignup(r2, pool);

		const cancelledReminders = await cancelPendingSignups(
			reminderCode,
			pool,
		);

		expect(cancelledReminders).toBe(1);
	});

	it('cancels a recurring reminder', async () => {
		expect.assertions(1);

		const identityId = '0';
		const reminder = createRecurringReminder({ identity_id: identityId });
		const reminderCode = await writeRecurringReminderAndGetCode(reminder);

		const cancelledReminders = await cancelPendingSignups(
			reminderCode,
			pool,
		);

		expect(cancelledReminders).toBe(1);
	});

	it('doesnt cancel a recurring reminder that has already been cancelled', async () => {
		expect.assertions(1);

		const identityId = '0';
		const reminder = createRecurringReminder({ identity_id: identityId });
		const reminderCode = await writeRecurringReminderAndGetCode(reminder);
		await cancelPendingSignups(reminderCode, pool);

		const cancelledReminders = await cancelPendingSignups(
			reminderCode,
			pool,
		);

		expect(cancelledReminders).toBe(0);
	});
});
