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

describe('cancelPendingReminders', () => {
	it('cancels all pending one-off reminders', async () => {
		expect.assertions(1);

		const identityId = '0';
		const r1 = createOneOffReminder({
			identity_id: identityId,
			reminder_period: '2021-01-01',
			reminder_code: '2b30dbdd-001f-4031-82e6-0d93e16e19f8'
		});
		const r2 = createOneOffReminder({
			identity_id: identityId,
			reminder_period: '2021-02-01',
		});
		await writeOneOffSignup(r1, pool);
		await writeOneOffSignup(r2, pool);

		const cancelledReminders = await cancelPendingSignups(
			'2b30dbdd-001f-4031-82e6-0d93e16e19f8',
			pool,
		);

		expect(cancelledReminders).toBe(2);
	});

	// it('doesnt cancel reminders that have already been cancelled', async () => {
	// 	expect.assertions(1);
	//
	// 	const identityId = '0';
	// 	const r1 = createOneOffReminder({
	// 		identity_id: identityId,
	// 		reminder_period: '2021-01-01',
	// 	});
	// 	await writeOneOffSignup(r1, pool);
	// 	await cancelPendingSignups({ identity_id: identityId }, pool);
	//
	// 	const r2 = createOneOffReminder({
	// 		identity_id: identityId,
	// 		reminder_period: '2021-02-01',
	// 	});
	// 	await writeOneOffSignup(r2, pool);
	//
	// 	const result = await cancelPendingSignups(
	// 		{ identity_id: identityId },
	// 		pool,
	// 	);
	// 	const cancelledReminders = result.oneOffQueryResult;
	//
	// 	expect(cancelledReminders.rowCount).toBe(1);
	// });
	//
	// it('cancels a recurring reminder', async () => {
	// 	expect.assertions(1);
	//
	// 	const identityId = '0';
	// 	const reminder = createRecurringReminder({ identity_id: identityId });
	// 	await writeRecurringSignup(reminder, pool);
	//
	// 	const result = await cancelPendingSignups(
	// 		{ identity_id: identityId },
	// 		pool,
	// 	);
	// 	const cancelledReminders = result.recurringQueryResult;
	//
	// 	expect(cancelledReminders.rowCount).toBe(1);
	// });
	//
	// it('doesnt cancel a recurring reminder that has already been cancelled', async () => {
	// 	expect.assertions(1);
	//
	// 	const identityId = '0';
	// 	const reminder = createRecurringReminder({ identity_id: identityId });
	// 	await writeRecurringSignup(reminder, pool);
	// 	await cancelPendingSignups({ identity_id: identityId }, pool);
	//
	// 	const result = await cancelPendingSignups(
	// 		{ identity_id: identityId },
	// 		pool,
	// 	);
	// 	const cancelledReminders = result.recurringQueryResult;
	//
	// 	expect(cancelledReminders.rowCount).toBe(0);
	// });
});
