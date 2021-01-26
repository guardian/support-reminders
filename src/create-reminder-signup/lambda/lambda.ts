import type { APIGatewayProxyResult } from 'aws-lambda';
import type { APIGatewayEvent, OneOffSignup } from './models';
import { schema } from './models';

export const handler = (
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

	return Promise.resolve({
		statusCode: 200,
		body: JSON.stringify(signup),
	});
};
