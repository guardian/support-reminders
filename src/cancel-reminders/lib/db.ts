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
				reminder_cancelled_at = $1
			WHERE
				identity_id = $2
				AND reminder_cancelled_at IS NULL
        `,
		values: [now.toISOString(), cancellation.identity_id],
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
		values: [now.toISOString(), cancellation.identity_id],
	};

	return {
		oneOffQueryResult: await runWithLogging(oneOffQuery, pool),
		recurringQueryResult: await runWithLogging(recurringQuery, pool),
	};
}
