import { Pool, QueryConfig, QueryResult } from 'pg';
import { runWithLogging } from '../../lib/db';

export async function getReminders(
	identityId: string,
	pool: Pool,
): Promise<QueryResult> {
	const query: QueryConfig = {
		text: `
			SELECT
				reminder_period::text,
				reminder_created_at::text,
				reminder_cancelled_at::text,
				reminder_code
			FROM
				one_off_reminder_signups
			WHERE
				identity_id = $1
		`,
		values: [identityId],
	};

	return runWithLogging(query, pool);
}
