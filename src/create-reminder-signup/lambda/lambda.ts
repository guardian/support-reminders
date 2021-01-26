import type { APIGatewayProxyResult } from 'aws-lambda';

interface APIGatewayEvent {
	body: string;
}

export const handler = (
	event: APIGatewayEvent,
): Promise<APIGatewayProxyResult> => {
	console.log('received event: ', event);

	return Promise.resolve({
		statusCode: 200,
		body: 'hello, world!',
	});
};
