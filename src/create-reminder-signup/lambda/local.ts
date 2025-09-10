import { SQSEvent } from 'aws-lambda';
import { run } from './lambda';

// Configure AWS SDK v3 with profile-based credentials
process.env.AWS_PROFILE = 'membership';
process.env.AWS_REGION = 'eu-west-1';

function runLocal() {
	console.log(__dirname);
	process.env.Stage = 'DEV';

	// @ts-expect-error -- only these fields are required
	const event = {
		Records: [
			{
				body: JSON.stringify({
					email: 'test-reminders10@theguardian.com',
					reminderPeriod: '2021-01-01',
					reminderFrequencyMonths: 3,
					reminderPlatform: 'WEB',
					reminderComponent: 'EPIC',
					reminderStage: 'PRE',
				}),
				messageId: 'test-id',
				messageAttributes: {
					'X-GU-GeoIP-Country-Code': {
						stringValue: 'GB',
					},
					EventPath: {
						stringValue: '/create/one-off',
					},
				},
			},
		],
	} as SQSEvent;

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
