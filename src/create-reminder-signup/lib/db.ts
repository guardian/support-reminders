import { Pool, QueryConfig, QueryResult } from 'pg';
import { runWithLogging } from '../../lib/db';
import { OneOffSignup, RecurringSignup } from '../lambda/models';

export function writeOneOffSignup(
	signup: OneOffSignup,
	pool: Pool,
): Promise<QueryResult> {
	const query: QueryConfig = {
		text: `
            INSERT INTO one_off_reminder_signups(
                identity_id,
                reminder_period,
                reminder_created_at,
                reminder_platform,
                reminder_component,
                reminder_stage,
                reminder_option
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7
            )
            ON CONFLICT ON CONSTRAINT one_off_reminder_signups_pkey
            DO
                UPDATE SET
                    reminder_created_at = $3,
                    reminder_platform = $4,
                    reminder_component = $5,
                    reminder_stage = $6,
                    reminder_option = $7
            RETURNING *;
        `,
		values: [
			signup.identity_id,
			signup.reminder_period,
			signup.reminder_created_at,
			signup.reminder_platform,
			signup.reminder_component,
			signup.reminder_stage,
			signup.reminder_option,
		],
	};

	return runWithLogging(query, pool);
}

export function writeRecurringSignup(
	signup: RecurringSignup,
	pool: Pool,
): Promise<QueryResult> {
	const query: QueryConfig = {
		text: `
            INSERT INTO recurring_reminder_signups(
                identity_id,
                reminder_frequency_months,
                reminder_created_at,
                reminder_platform,
                reminder_component,
                reminder_stage,
                reminder_option
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7
            )
            ON CONFLICT ON CONSTRAINT recurring_reminder_signups_pkey
            DO
                UPDATE SET
					reminder_frequency_months = $2,
                    reminder_created_at = $3,
                    reminder_platform = $4,
                    reminder_component = $5,
                    reminder_stage = $6,
                    reminder_option = $7
            RETURNING *;
        `,
		values: [
			signup.identity_id,
			signup.reminder_frequency_months,
			signup.reminder_created_at,
			signup.reminder_platform,
			signup.reminder_component,
			signup.reminder_stage,
			signup.reminder_option,
		],
	};

	return runWithLogging(query, pool);
}
