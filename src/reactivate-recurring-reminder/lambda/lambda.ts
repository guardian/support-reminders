import { APIGatewayProxyCallback, APIGatewayProxyResult } from 'aws-lambda';
import { APIGatewayEvent, ValidationErrors } from '../../lib/models';
import { reactivationValidator } from './models';

const headers = {
	'Content-Type': 'application/json',
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': '*',
	'Access-Control-Allow-Methods': '*',
};
export const run = (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
	console.log('received event: ', event);

	const reactivationRequest: unknown = JSON.parse(event.body);

	const validationErrors: ValidationErrors = [];
	if (!reactivationValidator(reactivationRequest, validationErrors)) {
		console.log('Validation of cancellation failed', validationErrors);
		return Promise.resolve({
			headers,
			statusCode: 400,
			body: 'Invalid body',
		});
	}

	return Promise.resolve({ headers, statusCode: 200, body: 'OK' });
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
