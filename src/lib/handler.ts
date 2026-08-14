import {
	APIGatewayProxyEvent,
	APIGatewayProxyHandler,
	APIGatewayProxyResult,
	Context,
	SQSBatchResponse,
	SQSEvent,
	SQSHandler,
} from 'aws-lambda';

const getHandler =
	<INPUT, OUTPUT>(run: (event: INPUT) => Promise<OUTPUT>) =>
	async (event: INPUT, context: Context): Promise<OUTPUT> => {
		// If we do not set this then the lambda will wait 10secs before completing.
		// This is because pg starts a 10sec timer for each new client (see idleTimeoutMillis in https://node-postgres.com/api/pool).
		// `callbackWaitsForEmptyEventLoop = false` ensures the invocation ends immediately (https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html)
		context.callbackWaitsForEmptyEventLoop = false;

		// setTimeout is necessary because of a bug in the node lambda runtime which can break requests to ssm
		await new Promise((resolve) => setTimeout(resolve));

		try {
			const result = await run(event);
			console.log('Returning to client:', JSON.stringify(result));
			return result;
		} catch (err) {
			console.log(`Error: ${(err as Error).message}`);
			throw err;
		}
	};

export const getApiGatewayHandler = (
	run: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>,
): APIGatewayProxyHandler => getHandler(run);

export const getSQSHandler = (
	run: (event: SQSEvent) => Promise<SQSBatchResponse>,
): SQSHandler => getHandler(run);
