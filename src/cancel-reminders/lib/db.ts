import { Pool, QueryConfig } from 'pg';
import { runWithLogging } from '../../lib/db';
import { getCurrentReminderPeriod } from '../../lib/utils';

async function getIdentityIdForReminderCode(
	reminderCode: string,
	pool: Pool,
): Promise<string | null> {
	const recurringQuery: QueryConfig = {
		text: `
			SELECT identity_id::text FROM recurring_reminder_signups
			WHERE reminder_code = $1
		`,
		values: [reminderCode],
	};

	const recurringResult = await runWithLogging(recurringQuery, pool);

	if (recurringResult.rows.length > 0) {
		return recurringResult.rows[0].identity_id as string;
	} else {
		const oneOffQuery: QueryConfig = {
			text: `
			SELECT identity_id::text FROM one_off_reminder_signups
			WHERE reminder_code = $1
		`,
			values: [reminderCode],
		};

		const oneOffResult = await runWithLogging(oneOffQuery, pool);

		if (oneOffResult.rows.length > 0) {
			return oneOffResult.rows[0].identity_id as string;
		}
	}

	console.warn(`No row found for reminder_code ${reminderCode}`);
	return null;
}

export async function cancelPendingSignups(
	reminderCode: string,
	pool: Pool,
	now: Date = new Date(),
): Promise<number> {
	// Find the signup for the given reminder_code, then use the identity_id to cancel all reminders for that user
	const identityId = await getIdentityIdForReminderCode(reminderCode, pool);
	const reminderPeriod = getCurrentReminderPeriod(now);

	if (identityId !== null) {
		const oneOffQuery: QueryConfig = {
			text: `
			UPDATE
				one_off_reminder_signups
			SET
				reminder_cancelled_at = $1
			WHERE
				identity_id = $2
				AND reminder_cancelled_at IS NULL
				AND DATE(reminder_period) >= Date($3)
        `,
			values: [now.toISOString(), identityId, reminderPeriod],
		};

		const recurringQuery: QueryConfig = {
			text: `
			UPDATE
				recurring_reminder_signups
			SET
				reminder_cancelled_at = $1
			WHERE
				identity_id = $2
				AND reminder_cancelled_at IS NULL
        `,
			values: [now.toISOString(), identityId],
		};

		return Promise.all([
			runWithLogging(oneOffQuery, pool),
			runWithLogging(recurringQuery, pool),
		]).then(
			([oneOffResult, recurringResult]) =>
				oneOffResult.rowCount + recurringResult.rowCount,
		);
	}
	return Promise.resolve(0);
}
