import { APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as SSM from 'aws-sdk/clients/ssm';
import { Pool } from 'pg';
import { createDatabaseConnectionPool } from '../../lib/db';
import { getHandler } from '../../lib/handler';
import { APIGatewayEvent, ValidationErrors } from '../../lib/models';
import { getDatabaseParamsFromSSM } from '../../lib/ssm';
import { getReminders } from '../lib/db';
import { oneOffReminderFromQueryRow, searchValidator } from './models';

const headers = {
	'Content-Type': 'application/json',
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': '*',
	'Access-Control-Allow-Methods': '*',
};

const ssm: SSM = new AWS.SSM({ region: 'eu-west-1' });

const dbConnectionPoolPromise: Promise<Pool> = getDatabaseParamsFromSSM(
	ssm,
).then(createDatabaseConnectionPool);

export const run = async (
	event: APIGatewayEvent,
): Promise<APIGatewayProxyResult> => {
	console.log('received event: ', event);

	const searchRequest: unknown = JSON.parse(event.body);

	const validationErrors: ValidationErrors = [];
	if (!searchValidator(searchRequest, validationErrors)) {
		console.log('Validation of cancellation failed', validationErrors);
		return {
			headers,
			statusCode: 400,
			body: 'Invalid body',
		};
	}

	const pool = await dbConnectionPoolPromise;

	const reminders = await getReminders(searchRequest.identityId, pool);

	return {
		headers,
		statusCode: 200,
		body: JSON.stringify({
			reminders: reminders.rows.map((row) =>
				oneOffReminderFromQueryRow(row),
			),
		}),
	};
};

export const handler = getHandler(run);
