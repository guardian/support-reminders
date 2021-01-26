import type { APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import type * as SSM from 'aws-sdk/clients/ssm';
import { getParamFromSSM, ssmStage } from '../../lib/ssm';
import { getIdentityIdByEmail } from '../lib/identity';
import type { APIGatewayEvent, OneOffSignup } from './models';
import { schema } from './models';

const ssm: SSM = new AWS.SSM({ region: 'eu-west-1' });

const identityAccessTokenPromise: Promise<string> = getParamFromSSM(
	ssm,
	`/support-reminders/idapi/${ssmStage}/accessToken`,
);

export const handler = async (
	event: APIGatewayEvent,
): Promise<APIGatewayProxyResult> => {
	console.log('received event: ', event);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Application boundary
	const body = JSON.parse(event.body);
	const validation = schema.validate(body);

	if (validation.error) {
		return Promise.resolve({
			statusCode: 400,
			body: validation.error.message,
		});
	}

	const signup = body as OneOffSignup;

	const identityAccessToken = await identityAccessTokenPromise;
	const identityId = await getIdentityIdByEmail(
		signup.email,
		identityAccessToken,
	);

	return Promise.resolve({
		statusCode: 200,
		body: JSON.stringify({ ...signup, identityId }),
	});
};
