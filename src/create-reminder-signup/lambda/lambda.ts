import { SQSBatchResponse, SQSEvent, SQSRecord } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as SSM from 'aws-sdk/clients/ssm';
import { Pool, QueryResult } from 'pg';
import { createDatabaseConnectionPool } from '../../lib/db';
import { getSQSHandler } from '../../lib/handler';
import { ValidationErrors } from '../../lib/models';
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

const ssm: SSM = new AWS.SSM({ region: 'eu-west-1' });

const dbConnectionPoolPromise: Promise<Pool> = getDatabaseParamsFromSSM(
	ssm,
).then(createDatabaseConnectionPool);
const identityAccessTokenPromise: Promise<string> = getParamFromSSM(
	ssm,
	`/support-reminders/idapi/${ssmStage}/accessToken`,
);

export const run = async (event: SQSEvent): Promise<SQSBatchResponse> => {
	console.log('received event: ', event);

	// SQS event source is configured with batchSize = 1
	const record = event.Records[0];

	// If there is an error, return the messageId to SQS
	return processRecord(record)
		.then(() => ({
			batchItemFailures: [{ itemIdentifier: record.messageId }],
		}))
		.catch((error) => {
			console.log(error);
			return {
				batchItemFailures: [{ itemIdentifier: record.messageId }],
			};
		});
};

const processRecord = (record: SQSRecord): Promise<void> => {
	const country =
		record.messageAttributes['X-GU-GeoIP-Country-Code'].stringValue;

	const eventPath = record.messageAttributes['EventPath'].stringValue;

	const signupRequest: unknown = {
		country,
		...JSON.parse(record.body),
	};

	if (eventPath === '/create/one-off') {
		return runOneOff(signupRequest);
	} else if (eventPath === '/create/recurring') {
		return runRecurring(signupRequest);
	} else {
		return Promise.reject(`Invalid path: ${String(eventPath)}`);
	}
};

const runOneOff = async (signupRequest: unknown): Promise<void> => {
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

const runRecurring = async (signupRequest: unknown): Promise<void> => {
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
): Promise<void> => {
	const validationErrors: ValidationErrors = [];
	if (!validator(signupRequest, validationErrors)) {
		console.log('Validation of signup failed', validationErrors);
		return Promise.reject('Validation of signup failed');
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
		console.log('dbResult: ', dbResult);

		if (dbResult.rowCount !== 1) {
			return Promise.reject(
				`Unexpected row count in database response: ${dbResult.rowCount}`,
			);
		}
	} else {
		return Promise.reject(identityResult.status.toString());
	}
};

export const handler = getSQSHandler(run);
