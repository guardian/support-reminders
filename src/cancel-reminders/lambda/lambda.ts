import { APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as SSM from 'aws-sdk/clients/ssm';
import { Pool } from 'pg';
import { createDatabaseConnectionPool } from '../../lib/db';
import { getHandler } from '../../lib/handler';
import { APIGatewayEvent, ValidationErrors } from '../../lib/models';
import { getDatabaseParamsFromSSM } from '../../lib/ssm';
import { cancelPendingSignups } from '../lib/db';
import { cancellationValidator } from './models';

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

	const cancellationRequest: unknown = JSON.parse(event.body);

	const validationErrors: ValidationErrors = [];
	if (!cancellationValidator(cancellationRequest, validationErrors)) {
		console.log('Validation of cancellation failed', validationErrors);
		return {
			headers,
			statusCode: 400,
			body: 'Invalid body',
		};
	}

	const pool = await dbConnectionPoolPromise;

	await cancelPendingSignups(cancellationRequest.reminderCode, pool);

	return { headers, statusCode: 200, body: 'OK' };
};

export const handler = getHandler(run);
