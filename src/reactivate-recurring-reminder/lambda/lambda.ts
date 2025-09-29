import { SSMClient } from '@aws-sdk/client-ssm';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import { createDatabaseConnectionPool } from '../../lib/db';
import { getApiGatewayHandler } from '../../lib/handler';
import { getDatabaseParamsFromSSM } from '../../lib/ssm';
import { reactivateRecurringReminder } from '../lib/db';
import { reactivationRequestSchema } from './models';

const headers = {
	'Content-Type': 'application/json',
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': '*',
	'Access-Control-Allow-Methods': '*',
};

const ssm = new SSMClient({ region: 'eu-west-1' });

const dbConnectionPoolPromise: Promise<Pool> = getDatabaseParamsFromSSM(
	ssm,
).then(createDatabaseConnectionPool);

export const run = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log('received event: ', event);

	const reactivationRequest: unknown = JSON.parse(event.body ?? '');

	const parseResult =
		reactivationRequestSchema.safeParse(reactivationRequest);
	if (parseResult.success) {
		const { reminderCode } = parseResult.data;

		const pool = await dbConnectionPoolPromise;

		await reactivateRecurringReminder(reminderCode, pool);

		return Promise.resolve({ headers, statusCode: 200, body: 'OK' });
	} else {
		console.log(
			'Validation of cancellation failed',
			parseResult.error.message,
		);
		return Promise.resolve({
			headers,
			statusCode: 400,
			body: 'Invalid body',
		});
	}
};

export const handler = getApiGatewayHandler(run);
