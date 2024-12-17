import {
	APIGatewayProxyEvent,
	APIGatewayProxyHandler,
	APIGatewayProxyResult,
	Callback,
	Context,
	SQSBatchResponse,
	SQSEvent,
	SQSHandler,
} from 'aws-lambda';

const getHandler =
	<INPUT, OUTPUT>(run: (event: INPUT) => Promise<OUTPUT>) =>
	(event: INPUT, context: Context, callback: Callback<OUTPUT>): void => {
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

export const getApiGatewayHandler = (
	run: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>,
): APIGatewayProxyHandler => getHandler(run);

export const getSQSHandler = (
	run: (event: SQSEvent) => Promise<SQSBatchResponse>,
): SQSHandler => getHandler(run);
