import { Pool, QueryConfig, QueryResult } from 'pg';
import { runWithLogging } from '../../lib/db';
import { getCurrentReminderPeriod } from '../../lib/utils';

export function getNextReminders(
	pool: Pool,
	now: Date = new Date(),
): Promise<QueryResult> {
	const currentReminderPeriod = getCurrentReminderPeriod(now);

	const query: QueryConfig = {
		text: `
			WITH one_offs AS (
				SELECT
					identity_id,
					reminder_period::text,
					reminder_created_at::text,
					reminder_platform,
					reminder_component,
					reminder_stage,
					'ONE_OFF' as reminder_type,
					reminder_option,
					reminder_code
				FROM
					one_off_reminder_signups
				WHERE
					reminder_cancelled_at IS NULL
					AND reminder_period = $1
			),
			recurrings AS (
				SELECT
					identity_id,
					DATE($1)::text AS reminder_period,
					reminder_created_at::text,
					reminder_platform,
					reminder_component,
					reminder_stage,
					'RECURRING' as reminder_type,
					reminder_option,
					reminder_code
				FROM
					recurring_reminder_signups
				WHERE
					reminder_cancelled_at IS NULL
					AND NOT (
						DATE_PART('year', DATE($1)) = DATE_PART('year', DATE(reminder_created_at))
						AND DATE_PART('month', DATE($1)) = DATE_PART('month', DATE(reminder_created_at))
					)
					AND CAST(
						(DATE_PART('year', DATE($1)) - DATE_PART('year', DATE(reminder_created_at))) * 12 +
						(DATE_PART('month', DATE($1)) - DATE_PART('month', DATE(reminder_created_at)))
					AS INT) % reminder_frequency_months = 0
			),
			combined AS (
				SELECT
					*
				FROM
					recurrings
				UNION SELECT
					*
				FROM
					one_offs
				ORDER BY
					reminder_type DESC,
					reminder_created_at ASC
			)
			SELECT DISTINCT ON (identity_id)
				*
			FROM
				combined;
        `,
		values: [currentReminderPeriod],
	};

	return runWithLogging(query, pool);
}
