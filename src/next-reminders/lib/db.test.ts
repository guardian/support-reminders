import { readFileSync } from 'fs';
import {
	OneOffSignup,
	RecurringSignup,
} from '../../create-reminder-signup/lambda/models';
import {
	writeOneOffSignup,
	writeRecurringSignup,
} from '../../create-reminder-signup/lib/db';
import { createDatabaseConnectionPool, DBConfig } from '../../lib/db';
import {
	createOneOffReminder,
	createRecurringReminder,
} from '../../test/helpers';
import { getNextReminders } from './db';

const config: DBConfig = {
	url: process.env.TEST_DB_URL ?? '',
	username: process.env.TEST_DB_USER ?? '',
	password: process.env.TEST_DB_PASSWORD ?? '',
};

const pool = createDatabaseConnectionPool(config);

const cancelOneOffReminder = (reminder: OneOffSignup, cancelled_at: string) => {
	return pool.query({
		text: `
	UPDATE one_off_reminder_signups
	SET
		reminder_cancelled_at = $2
	WHERE
		identity_id = $1
 `,
		values: [reminder.identity_id, cancelled_at],
	});
};

const cancelRecurringReminder = (
	reminder: RecurringSignup,
	cancelled_at: string,
) => {
	return pool.query({
		text: `
	UPDATE recurring_reminder_signups
	SET
		reminder_cancelled_at = $2
	WHERE
		identity_id = $1
 `,
		values: [reminder.identity_id, cancelled_at],
	});
};

beforeAll(() => {
	const initDatabase = async (): Promise<void> => {
		const query = readFileSync(
			'./sql/create-signups-tables.sql',
		).toString();

		await pool.query(query);
	};

	return initDatabase();
});

afterAll(() => {
	const cleanUpDatabase = async () => {
		await pool.end();
	};

	return cleanUpDatabase();
});

beforeEach(() => {
	const cleanUpDatabase = async () => {
		await pool.query(`
			TRUNCATE TABLE
				one_off_reminder_signups,
				recurring_reminder_signups
		`);
	};

	return cleanUpDatabase();
});

describe('getNextReminders', () => {
	it('returns one-off reminders in the current reminder period', async () => {
		expect.assertions(1);

		const today = '2021-01-10';
		const currentReminderPeriod = '2021-01-01';
		const reminder = createOneOffReminder({
			reminder_period: currentReminderPeriod,
		});
		await writeOneOffSignup(reminder, pool);

		const nextReminders = await getNextReminders(pool, new Date(today));

		expect(nextReminders.rowCount).toBe(1);
	});

	it('doesnt return one-off reminders in the current reminder period that are cancelled', async () => {
		expect.assertions(1);

		const today = '2021-01-10';
		const currentReminderPeriod = '2021-01-01';
		const reminder = createOneOffReminder({
			reminder_period: currentReminderPeriod,
		});
		await writeOneOffSignup(reminder, pool);
		await cancelOneOffReminder(reminder, today);

		const nextReminders = await getNextReminders(pool, new Date(today));

		expect(nextReminders.rowCount).toBe(0);
	});

	it('doesnt return one-off reminders outside of the current reminder period', async () => {
		expect.assertions(1);

		const today = '2021-01-10';
		const reminderPeriod = '2021-02-01';
		const reminder = createOneOffReminder({
			reminder_period: reminderPeriod,
		});
		await writeOneOffSignup(reminder, pool);

		const nextReminders = await getNextReminders(pool, new Date(today));

		expect(nextReminders.rowCount).toBe(0);
	});

	it('returns recurring reminders in the current reminder period', async () => {
		expect.assertions(1);

		const today = '2022-04-10';
		const reminder = createRecurringReminder({
			reminder_created_at: '2021-01-01',
			reminder_frequency_months: 3,
		});
		await writeRecurringSignup(reminder, pool);

		const nextReminders = await getNextReminders(pool, new Date(today));

		expect(nextReminders.rowCount).toBe(1);
	});

	it('doesnt return recurring reminders that have just been created', async () => {
		expect.assertions(1);

		const today = '2021-01-10';
		const reminder = createRecurringReminder({
			reminder_created_at: '2021-01-01',
			reminder_frequency_months: 3,
		});
		await writeRecurringSignup(reminder, pool);

		const nextReminders = await getNextReminders(pool, new Date(today));

		expect(nextReminders.rowCount).toBe(0);
	});

	it('doesnt return recurring reminders that have been cancelled', async () => {
		expect.assertions(1);

		const today = '2022-04-10';
		const reminder = createRecurringReminder({
			reminder_created_at: '2021-01-01',
			reminder_frequency_months: 3,
		});
		await writeRecurringSignup(reminder, pool);
		await cancelRecurringReminder(reminder, today);

		const nextReminders = await getNextReminders(pool, new Date(today));

		expect(nextReminders.rowCount).toBe(0);
	});

	it('returns a recurring reminder if a user has signed up for both in the current reminder period', async () => {
		expect.assertions(2);

		const today = '2022-04-10';
		const recurringReminder = createRecurringReminder({
			identity_id: '0',
			reminder_created_at: '2021-01-01',
			reminder_frequency_months: 3,
		});
		const oneOffReminder = createOneOffReminder({
			identity_id: '0',
			reminder_period: '2022-04-01',
		});

		await writeRecurringSignup(recurringReminder, pool);
		await writeOneOffSignup(oneOffReminder, pool);

		const nextReminders = await getNextReminders(pool, new Date(today));

		expect(nextReminders.rowCount).toBe(1);
		expect(nextReminders.rows[0].reminder_type).toBe('RECURRING');
	});
});
