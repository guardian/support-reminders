import * as AWS from 'aws-sdk';
import { handler } from './lambda';

const config = new AWS.Config();
const credentials = new AWS.SharedIniFileCredentials({ profile: 'membership' });
config.update({ region: 'eu-west-1', credentials });

function run() {
	console.log(__dirname);
	process.env.Stage = 'DEV';

	const event = {
		body: 'hello',
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
