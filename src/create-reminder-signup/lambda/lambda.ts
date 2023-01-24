import { APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as SSM from 'aws-sdk/clients/ssm';
import { Pool, QueryResult } from 'pg';
import { createDatabaseConnectionPool } from '../../lib/db';
import { getHandler } from '../../lib/handler';
import { APIGatewayEvent, ValidationErrors } from '../../lib/models';
import {
	getDatabaseParamsFromSSM,
	getParamFromSSM,
	ssmStage,
} from '../../lib/ssm';
import { writeOneOffSignup, writeRecurringSignup } from '../lib/db';
import { getOrCreateIdentityIdByEmail } from '../lib/identity';
import {
	BaseSignupRequest,
	oneOffSignupFromRequest,
	OneOffSignupRequest,
	oneOffSignupValidator,
	recurringSignupFromRequest,
	RecurringSignupRequest,
	recurringSignupValidator,
} from './models';

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

	const country = event.headers['X-GU-GeoIP-Country-Code'];
	const signupRequest: unknown = { country, ...JSON.parse(event.body) };

	if (event.path === '/create/one-off') {
		return runOneOff(signupRequest);
	} else if (event.path === '/create/recurring') {
		return runRecurring(signupRequest);
	}

	return { headers, statusCode: 404, body: 'Not found' };
};

export const runOneOff = async (
	signupRequest: unknown,
): Promise<APIGatewayProxyResult> => {
	const persist = (
		signupRequest: OneOffSignupRequest,
		identityId: string,
		pool: Pool,
	) => {
		const signup = oneOffSignupFromRequest(identityId, signupRequest);
		console.log('------------------ signup ----------------------');
		console.log(signup);
		console.log('------------------------------------------------');

		const result = writeOneOffSignup(signup, pool);
		console.log(
			'------------------ writeOneOffSignup ----------------------',
		);
		console.log(result);
		console.log('------------------------------------------------');

		return result;
	};

	return createSignup(signupRequest, oneOffSignupValidator, persist);
};

export const runRecurring = async (
	signupRequest: unknown,
): Promise<APIGatewayProxyResult> => {
	const persist = (
		signupRequest: RecurringSignupRequest,
		identityId: string,
		pool: Pool,
	) => {
		const signup = recurringSignupFromRequest(identityId, signupRequest);
		return writeRecurringSignup(signup, pool);
	};

	return createSignup(signupRequest, recurringSignupValidator, persist);
};

type Validator<T> = (
	signupRequest: unknown,
	validationErrors: ValidationErrors,
) => signupRequest is T;

type Persist<T> = (
	signupRequest: T,
	identityId: string,
	pool: Pool,
) => Promise<QueryResult>;

const createSignup = async <T extends BaseSignupRequest>(
	signupRequest: unknown,
	validator: Validator<T>,
	persist: Persist<T>,
): Promise<APIGatewayProxyResult> => {
	const validationErrors: ValidationErrors = [];
	if (!validator(signupRequest, validationErrors)) {
		console.log('Validation of signup failed', validationErrors);
		return {
			headers,
			statusCode: 400,
			body: 'Invalid body',
		};
	}

	const token = await identityAccessTokenPromise;
	const pool = await dbConnectionPoolPromise;

	const identityResult = await getOrCreateIdentityIdByEmail(
		signupRequest.email,
		signupRequest.reminderStage,
		token,
	);

	if (identityResult.name === 'success') {
		const dbResult = await persist(
			signupRequest,
			identityResult.identityId,
			pool,
		);

		if (dbResult.rowCount !== 1) {
			return {
				headers,
				statusCode: 500,
				body: 'Internal Server Error',
			};
		}
		return {
			headers,
			statusCode: 200,
			body: 'OK',
		};
	} else {
		return {
			headers,
			statusCode: identityResult.status,
			body: identityResult.status.toString(),
		};
	}
};

export const handler = getHandler(run);
