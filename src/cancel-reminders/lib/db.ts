import { Pool, QueryConfig, QueryResult } from 'pg';
import { runWithLogging } from '../../lib/db';
import { Cancellation } from '../lambda/models';

interface CancelQueryResult {
	oneOffQueryResult: QueryResult;
	recurringQueryResult: QueryResult;
}

export async function cancelPendingSignups(
	cancellation: Cancellation,
	pool: Pool,
): Promise<CancelQueryResult> {
	const now = new Date();

	const oneOffQuery: QueryConfig = {
		text: `
			UPDATE
				one_off_reminder_signups
			SET
				reminder_cancelled_at = $2,
				reminder_updated_at = $2
			WHERE
				identity_id = $1
				AND reminder_cancelled_at IS NULL
        `,
		values: [cancellation.identity_id, now.toISOString()],
	};

	const recurringQuery: QueryConfig = {
		text: `
			UPDATE
				recurring_reminder_signups
			SET
				reminder_cancelled_at = $2,
				reminder_updated_at = $2
			WHERE
				identity_id = $1
				AND reminder_cancelled_at IS NULL
        `,
		values: [cancellation.identity_id, now.toISOString()],
	};

	return {
		oneOffQueryResult: await runWithLogging(oneOffQuery, pool),
		recurringQueryResult: await runWithLogging(recurringQuery, pool),
	};
}
