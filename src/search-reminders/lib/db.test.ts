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
import { getReminders } from './db';

const pool = createDatabaseConnectionPool(config);

afterAll(() => {
	const cleanUpDatabase = async () => {
		await pool.end();
	};

	return cleanUpDatabase();
});

const IDENTITY_ID = '12345';

describe('getReminders', () => {
	it('finds one off reminders', async () => {
		// Write the reminder we want to search for
		await writeOneOffSignup(
			createOneOffReminder({ identity_id: IDENTITY_ID }),
			pool,
		);
		// Write a few extra reminders we don't want to search for
		await writeOneOffSignup(createOneOffReminder({}), pool);
		await writeOneOffSignup(createOneOffReminder({}), pool);

		const reminders = await getReminders(IDENTITY_ID, pool);

		expect(reminders.rowCount).toBe(1);
	});

	it('finds recurring reminders', async () => {
		await writeRecurringSignup(
			createRecurringReminder({ identity_id: IDENTITY_ID }),
			pool,
		);

		const reminders = await getReminders(IDENTITY_ID, pool);

		expect(reminders.rowCount).toBe(1);
	});
});
