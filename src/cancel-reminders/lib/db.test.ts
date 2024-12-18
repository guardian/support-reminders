import {
	OneOffSignup,
	RecurringSignup,
} from '../../create-reminder-signup/lambda/models';
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

const pool = createDatabaseConnectionPool(config);

afterAll(() => {
	const cleanUpDatabase = async () => {
		await pool.end();
	};

	return cleanUpDatabase();
});

const writeOneOffReminderAndGetCode = async (
	signup: OneOffSignup,
): Promise<string> => {
	const result = await writeOneOffSignup(signup, pool);
	return result.rows[0].reminder_code as string;
};
const writeRecurringReminderAndGetCode = async (
	signup: RecurringSignup,
): Promise<string> => {
	const result = await writeRecurringSignup(signup, pool);
	return result.rows[0].reminder_code as string;
};

describe('cancelPendingReminders', () => {
	const now = new Date('2021-01-01');

	it('cancels all pending one-off reminders', async () => {
		expect.assertions(1);

		const r1 = createOneOffReminder({
			reminder_period: '2021-01-01',
		});
		const r2 = createOneOffReminder({
			reminder_period: '2021-02-01',
		});
		const reminderCode = await writeOneOffReminderAndGetCode(r1);
		await writeOneOffSignup(r2, pool);

		const cancelledReminders = await cancelPendingSignups(
			reminderCode,
			pool,
			now,
		);

		expect(cancelledReminders).toBe(2);
	});

	it('doesnt cancel reminders that have already been sent', async () => {
		expect.assertions(1);

		const reminder = createOneOffReminder({
			reminder_period: '2020-12-01',
		});
		const reminderCode = await writeOneOffReminderAndGetCode(reminder);

		const cancelledReminders = await cancelPendingSignups(
			reminderCode,
			pool,
			now,
		);

		expect(cancelledReminders).toBe(0);
	});

	it('doesnt cancel reminders that have already been cancelled', async () => {
		expect.assertions(1);

		const r1 = createOneOffReminder({
			reminder_period: '2021-01-01',
		});
		const reminderCode = await writeOneOffReminderAndGetCode(r1);
		await cancelPendingSignups(reminderCode, pool, now);

		const r2 = createOneOffReminder({
			reminder_period: '2021-02-01',
		});
		await writeOneOffSignup(r2, pool);

		const cancelledReminders = await cancelPendingSignups(
			reminderCode,
			pool,
			now,
		);

		expect(cancelledReminders).toBe(1);
	});

	it('cancels a recurring reminder', async () => {
		expect.assertions(1);

		const reminder = createRecurringReminder({});
		const reminderCode = await writeRecurringReminderAndGetCode(reminder);

		const cancelledReminders = await cancelPendingSignups(
			reminderCode,
			pool,
		);

		expect(cancelledReminders).toBe(1);
	});

	it('doesnt cancel a recurring reminder that has already been cancelled', async () => {
		expect.assertions(1);

		const reminder = createRecurringReminder({});
		const reminderCode = await writeRecurringReminderAndGetCode(reminder);
		await cancelPendingSignups(reminderCode, pool);

		const cancelledReminders = await cancelPendingSignups(
			reminderCode,
			pool,
		);

		expect(cancelledReminders).toBe(0);
	});
});
