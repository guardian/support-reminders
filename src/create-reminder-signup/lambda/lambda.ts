import { APIGatewayProxyCallback, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as SSM from 'aws-sdk/clients/ssm';
import { Pool } from 'pg';
import { createDatabaseConnectionPool } from '../../lib/db';
import {
	getDatabaseParamsFromSSM,
	getParamFromSSM,
	ssmStage,
} from '../../lib/ssm';
import { writeOneOffSignup } from '../lib/db';
import { getOrCreateIdentityIdByEmail } from '../lib/identity';
import {
	APIGatewayEvent,
	oneOffSignupFromRequest,
	oneOffSignupValidator,
	ValidationErrors,
} from './models';

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

	const signupRequest: unknown = JSON.parse(event.body);

	const validationErrors: ValidationErrors = [];
	if (!oneOffSignupValidator(signupRequest, validationErrors)) {
		console.log('Validation of signup failed', validationErrors);
		return Promise.resolve({
			statusCode: 400,
			body: 'Invalid body',
		});
	}

	const token = await identityAccessTokenPromise;
	const pool = await dbConnectionPoolPromise;

	const identityResult = await getOrCreateIdentityIdByEmail(
		signupRequest.email,
		signupRequest.reminderStage,
		token,
	);

	if (identityResult.name === 'success') {
		const signup = oneOffSignupFromRequest(
			identityResult.identityId,
			signupRequest,
		);
		const dbResult = await writeOneOffSignup(signup, pool);

		if (dbResult.rowCount !== 1) {
			return {
				statusCode: 500,
				body: 'Internal Server Error',
			};
		}
		return {
			statusCode: 200,
			body: 'OK',
		};
	} else {
		const statusCode = identityResult.status === 404 ? 400 : 500;
		return {
			statusCode,
			body: statusCode.toString(),
		};
	}
};

export const handler = (
	event: APIGatewayEvent,
	context: unknown,
	callback: APIGatewayProxyCallback,
): void => {
	// setTimeout is necessary because of a bug in the node lambda runtime which can break requests to ssm
	setTimeout(() => {
		run(event)
			.then((result) => callback(null, result))
			.catch((err) => callback(err));
	});
};
