import { Pool, QueryConfig, QueryResult } from 'pg';
import { runWithLogging } from '../../lib/db';
import { getYesterday } from './utils';

export function getCreatedOrCancelledOneOffSignupsFromYesterday(
	pool: Pool,
): Promise<QueryResult> {
	const yesterday = getYesterday();

	const query: QueryConfig = {
		text: `
			SELECT
				identity_id,
				country,
				reminder_period::text,
				reminder_created_at::text,
				reminder_cancelled_at::text,
				reminder_platform,
				reminder_component,
				reminder_stage,
				reminder_option
			FROM one_off_reminder_signups
			WHERE DATE(reminder_created_at) = DATE($1)
				OR DATE(reminder_cancelled_at) = DATE($1)
        `,
		values: [yesterday],
	};

	return runWithLogging(query, pool);
}

export function getCreatedOrCancelledRecurringSignupsFromYesterday(
	pool: Pool,
): Promise<QueryResult> {
	const yesterday = getYesterday();

	const query: QueryConfig = {
		text: `
			SELECT
				identity_id,
				country,
				reminder_frequency_months,
				reminder_created_at::text,
				reminder_cancelled_at::text,
				reminder_platform,
				reminder_component,
				reminder_stage,
				reminder_option
			FROM recurring_reminder_signups
			WHERE DATE(reminder_created_at) = DATE($1)
				OR DATE(reminder_cancelled_at) = DATE($1)
        `,
		values: [yesterday],
	};

	return runWithLogging(query, pool);
}
