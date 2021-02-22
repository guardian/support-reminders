import { Pool, QueryConfig, QueryResult } from 'pg';
import { runWithLogging } from '../../lib/db';
import { OneOffSignup, RecurringSignup } from '../lambda/models';

export function writeOneOffSignup(
	signup: OneOffSignup,
	pool: Pool,
): Promise<QueryResult> {
	const now = new Date();

	const query: QueryConfig = {
		text: `
			INSERT INTO one_off_reminder_signups(
				identity_id,
				country,
				reminder_period,
				reminder_created_at,
				reminder_updated_at,
				reminder_platform,
				reminder_component,
				reminder_stage,
				reminder_option
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9
			)
			ON CONFLICT ON CONSTRAINT one_off_reminder_signups_pkey
			DO
				UPDATE SET
					country = $2,
					reminder_created_at = $4,
					reminder_updated_at = $5,
					reminder_platform = $6,
					reminder_component = $7,
					reminder_stage = $8,
					reminder_option = $9,
					reminder_cancelled_at = NULL
			RETURNING *;
		`,
		values: [
			signup.identity_id,
			signup.country,
			signup.reminder_period,
			signup.reminder_created_at,
			now.toISOString(),
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
	const now = new Date();

	const query: QueryConfig = {
		text: `
			INSERT INTO recurring_reminder_signups(
				identity_id,
				country,
				reminder_frequency_months,
				reminder_created_at,
				reminder_updated_at,
				reminder_platform,
				reminder_component,
				reminder_stage,
				reminder_option
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9
			)
			ON CONFLICT ON CONSTRAINT recurring_reminder_signups_pkey
			DO
				UPDATE SET
					country = $2,
					reminder_frequency_months = $3,
					reminder_created_at = $4,
					reminder_updated_at = $5,
					reminder_platform = $6,
					reminder_component = $7,
					reminder_stage = $8,
					reminder_option = $9,
					reminder_cancelled_at = NULL
			RETURNING *;
		`,
		values: [
			signup.identity_id,
			signup.country,
			signup.reminder_frequency_months,
			signup.reminder_created_at,
			now.toISOString(),
			signup.reminder_platform,
			signup.reminder_component,
			signup.reminder_stage,
			signup.reminder_option,
		],
	};

	return runWithLogging(query, pool);
}
