import { APIGatewayProxyCallback, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as SSM from 'aws-sdk/clients/ssm';
import { Pool } from 'pg';
import { createDatabaseConnectionPool } from '../../lib/db';
import { getIdentityIdByEmail } from '../../lib/identity';
import { APIGatewayEvent, ValidationErrors } from '../../lib/models';
import {
	getDatabaseParamsFromSSM,
	getParamFromSSM,
	ssmStage,
} from '../../lib/ssm';
import { cancelPendingSignups } from '../lib/db';
import { Cancellation, cancellationValidator } from './models';

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

const identityAccessTokenPromise: Promise<string> = getParamFromSSM(
	ssm,
	`/support-reminders/idapi/${ssmStage}/accessToken`,
);

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
	const token = await identityAccessTokenPromise;

	const identityResult = await getIdentityIdByEmail(
		cancellationRequest.email,
		token,
	);

	if (identityResult.name === 'failure') {
		const statusCode = identityResult.status === 404 ? 400 : 500;
		return {
			headers,
			statusCode,
			body: statusCode.toString(),
		};
	}

	const cancellation: Cancellation = {
		identity_id: identityResult.identityId,
	};

	await cancelPendingSignups(cancellation, pool);

	return { headers, statusCode: 200, body: 'OK' };
};

export const handler = (
	event: APIGatewayEvent,
	context: unknown,
	callback: APIGatewayProxyCallback,
): void => {
	// setTimeout is necessary because of a bug in the node lambda runtime which can break requests to ssm
	setTimeout(() => {
		run(event)
			.then((result) => {
				console.log('Returning to client:', JSON.stringify(result));
				callback(null, result);
			})
			.catch((err) => {
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- any
				console.log(`Error: ${err}`);
				callback(err);
			});
	});
};
