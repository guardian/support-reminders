import { APIGatewayProxyCallback, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as SSM from 'aws-sdk/clients/ssm';
import { Pool, QueryResult } from 'pg';
import { createDatabaseConnectionPool } from '../../lib/db';
import {
	getDatabaseParamsFromSSM,
	getParamFromSSM,
	ssmStage,
} from '../../lib/ssm';
import { writeOneOffSignup, writeRecurringSignup } from '../lib/db';
import { getOrCreateIdentityIdByEmail } from '../lib/identity';
import {
	APIGatewayEvent,
	BaseSignupRequest,
	oneOffSignupFromRequest,
	OneOffSignupRequest,
	oneOffSignupValidator,
	recurringSignupFromRequest,
	RecurringSignupRequest,
	recurringSignupValidator,
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

	const country = event.headers['X-GU-GeoIP-Country-Code'];
	const signupRequest: unknown = { ...JSON.parse(event.body), country };

	if (event.path === '/create/one-off') {
		return runOneOff(signupRequest);
	} else if (event.path === '/create/recurring') {
		return runRecurring(signupRequest);
	}

	return { statusCode: 404, body: 'Not found' };
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
		return writeOneOffSignup(signup, pool);
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
