import {
	APIGatewayProxyCallback,
	APIGatewayProxyResult,
	Context,
} from 'aws-lambda';
import { APIGatewayEvent } from './models';

export const getHandler = (
	run: (event: APIGatewayEvent) => Promise<APIGatewayProxyResult>,
) => (
	event: APIGatewayEvent,
	context: Context,
	callback: APIGatewayProxyCallback,
): void => {
	// setTimeout is necessary because of a bug in the node lambda runtime which can break requests to ssm
	setTimeout(() => {
		// If we do not set this then the lambda will wait 10secs before completing.
		// This is because pg starts a 10sec timer for each new client (see idleTimeoutMillis in https://node-postgres.com/api/pool).
		// `callbackWaitsForEmptyEventLoop = false` ensures the invocation ends immediately (https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html)
		context.callbackWaitsForEmptyEventLoop = false;

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
