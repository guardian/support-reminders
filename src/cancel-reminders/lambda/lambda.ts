import { SSM } from '@aws-sdk/client-ssm';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import { createDatabaseConnectionPool } from '../../lib/db';
import { getApiGatewayHandler } from '../../lib/handler';
import { getDatabaseParamsFromSSM } from '../../lib/ssm';
import { cancelPendingSignups } from '../lib/db';
import { cancellationRequestSchema } from './models';

const headers = {
	'Content-Type': 'application/json',
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': '*',
	'Access-Control-Allow-Methods': '*',
};

const ssm: SSM = new SSM({
	region: 'eu-west-1',
});

const dbConnectionPoolPromise: Promise<Pool> = getDatabaseParamsFromSSM(
	ssm,
).then(createDatabaseConnectionPool);

export const run = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log('received event: ', event);

	const cancellationRequest: unknown = JSON.parse(event.body ?? '');

	const parseResult =
		cancellationRequestSchema.safeParse(cancellationRequest);

	if (parseResult.success) {
		const { reminderCode } = parseResult.data;

		const pool = await dbConnectionPoolPromise;

		await cancelPendingSignups(reminderCode, pool);

		return { headers, statusCode: 200, body: 'OK' };
	} else {
		console.log(
			'Validation of cancellation failed',
			parseResult.error.message,
		);
		return {
			headers,
			statusCode: 400,
			body: 'Invalid body',
		};
	}
};

export const handler = getApiGatewayHandler(run);
