import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as SSM from 'aws-sdk/clients/ssm';
import { Pool } from 'pg';
import { createDatabaseConnectionPool } from '../../lib/db';
import { getApiGatewayHandler } from '../../lib/handler';
import { ValidationErrors } from '../../lib/models';
import { getDatabaseParamsFromSSM } from '../../lib/ssm';
import { reactivateRecurringReminder } from '../lib/db';
import { reactivationValidator } from './models';

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
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log('received event: ', event);

	const reactivationRequest: unknown = JSON.parse(event.body ?? '');

	const validationErrors: ValidationErrors = [];
	if (!reactivationValidator(reactivationRequest, validationErrors)) {
		console.log('Validation of cancellation failed', validationErrors);
		return Promise.resolve({
			headers,
			statusCode: 400,
			body: 'Invalid body',
		});
	}

	const pool = await dbConnectionPoolPromise;

	await reactivateRecurringReminder(reactivationRequest.reminderCode, pool);

	return Promise.resolve({ headers, statusCode: 200, body: 'OK' });
};

export const handler = getApiGatewayHandler(run);
