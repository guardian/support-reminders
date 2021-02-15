import * as AWS from 'aws-sdk';
import { run } from './lambda';

const config = new AWS.Config();
const credentials = new AWS.SharedIniFileCredentials({ profile: 'membership' });
config.update({ region: 'eu-west-1', credentials });

function runLocal() {
	console.log(__dirname);
	process.env.Stage = 'DEV';

	const event = {
		path: '/cancel',
		headers: {},
		body: JSON.stringify({
			email: 'test-reminders10@theguardian.com',
		}),
	};

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
