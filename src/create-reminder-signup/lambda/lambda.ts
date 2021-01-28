import { APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as SSM from 'aws-sdk/clients/ssm';
import { getParamFromSSM, ssmStage } from '../../lib/ssm';
import { getOrCreateIdentityIdByEmail, IdentityResult } from '../lib/identity';
import {APIGatewayEvent, oneOffSignupValidator} from './models';

const ssm: SSM = new AWS.SSM({ region: 'eu-west-1' });

const identityAccessTokenPromise: Promise<string> = getParamFromSSM(
	ssm,
	`/support-reminders/idapi/${ssmStage}/accessToken`,
);

export const handler = (
	event: APIGatewayEvent,
): Promise<APIGatewayProxyResult> => {
	console.log('received event: ', event);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Application boundary
	const signup: unknown = JSON.parse(event.body);

	const validationError: any[] = [];
	if (!oneOffSignupValidator(signup, validationError)) {
		console.log('Validation of signup failed', validationError);
		return Promise.resolve({
			statusCode: 400,
			body: 'Invalid body',
		});
	}

	return identityAccessTokenPromise
		.then((token) =>
			getOrCreateIdentityIdByEmail(
				signup.email,
				signup.reminderStage,
				token,
			),
		)
		.then((result: IdentityResult) => {
			if (result.name === 'success') {
				//TODO - write db
				return {
					statusCode: 200,
					body: JSON.stringify({
						...signup,
						identityId: result.identityId,
					}),
				};
			} else {
				const statusCode = result.status === 404 ? 400 : 500;
				return {
					statusCode,
					body: statusCode.toString(),
				};
			}
		})
		.catch((err) => {
			console.log(err);
			return {
				statusCode: 500,
				body: 'Internal Server Error',
			};
		});
};
