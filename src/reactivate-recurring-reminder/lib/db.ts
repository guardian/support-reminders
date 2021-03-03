import { Pool, QueryConfig, QueryResult } from 'pg';
import { runWithLogging } from '../../lib/db';

export async function reactivateRecurringReminder(
	reminderCode: string,
	pool: Pool,
): Promise<QueryResult> {
	const now = new Date();

	const query: QueryConfig = {
		text: `
			UPDATE
				recurring_reminder_signups
			SET
				reminder_created_at = $2,
				reminder_cancelled_at = NULL
			WHERE
				reminder_code = $1
				AND reminder_cancelled_at IS NOT NULL
        `,
		values: [reminderCode, now.toISOString()],
	};
	return runWithLogging(query, pool);
}
