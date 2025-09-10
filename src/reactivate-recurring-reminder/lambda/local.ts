import { APIGatewayProxyEvent } from 'aws-lambda';
import { run } from './lambda';

// Configure AWS SDK v3 with profile-based credentials
process.env.AWS_PROFILE = 'membership';
process.env.AWS_REGION = 'eu-west-1';

function runLocal() {
	console.log(__dirname);
	process.env.Stage = 'DEV';

	const event = {
		path: '/reactivate',
		headers: {},
		body: JSON.stringify({
			reminderCode: 'reminderCode',
		}),
	} as APIGatewayProxyEvent;

	run(event)
		.then((result) => {
			console.log('============================');
			console.log('Result: ', result);
		})
		.catch((err) => {
			console.log('============================');
			console.log('Failed to run locally: ', err);
		});
}

runLocal();
