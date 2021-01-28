import * as AWS from 'aws-sdk';
import { handler } from './lambda';

const config = new AWS.Config();
const credentials = new AWS.SharedIniFileCredentials({ profile: 'membership' });
config.update({ region: 'eu-west-1', credentials });

function run() {
	console.log(__dirname);
	process.env.Stage = 'DEV';

	const event = {
		body: JSON.stringify({
			email: 'test-reminders10@theguardian.com',
			reminderPeriod: '2021-01',
			reminderPlatform: 'WEB',
			reminderComponent: 'EPIC',
			reminderStage: 'PRE',
		}),
	};

	handler(event)
		.then((result) => {
			console.log('============================');
			console.log('Result: ', result);
		})
		.catch((err) => {
			console.log('============================');
			console.log('Failed to run locally: ', err);
		});
}

run();
