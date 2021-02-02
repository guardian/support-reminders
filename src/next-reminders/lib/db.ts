import { Pool, QueryConfig, QueryResult } from 'pg';
import { runWithLogging } from '../../lib/db';
import { getCurrentReminderPeriod } from './utils';

export function getNextReminders(pool: Pool): Promise<QueryResult> {
	const currentReminderPeriod = getCurrentReminderPeriod();

	const query: QueryConfig = {
		text: `
			SELECT
				identity_id,
				reminder_period::text,
				reminder_created_at::text,
				reminder_platform,
				reminder_component,
				reminder_stage,
				reminder_option,
				'ONE_OFF' as reminder_type
			FROM one_off_reminder_signups
			WHERE reminder_period = $1
        `,
		values: [currentReminderPeriod],
	};

	return runWithLogging(query, pool);
}
