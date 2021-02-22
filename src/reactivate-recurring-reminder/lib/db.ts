import { Pool, QueryConfig, QueryResult } from 'pg';
import { runWithLogging } from '../../lib/db';
import { Reactivation } from '../lambda/models';

export async function reactivateRecurringReminder(
	reactivation: Reactivation,
	pool: Pool,
): Promise<QueryResult> {
	const query: QueryConfig = {
		text: `
			UPDATE
				recurring_reminder_signups
			SET
				reminder_cancelled_at = NULL
			WHERE
				identity_id = $1
				AND reminder_cancelled_at IS NOT NULL
        `,
		values: [reactivation.identity_id],
	};
	return runWithLogging(query, pool);
}
