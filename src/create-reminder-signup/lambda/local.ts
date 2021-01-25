
import { handler } from './lambda';
const AWS = require('aws-sdk');
import * as input from "./dummy-input.json"

/**
 * For testing locally:
 * `yarn run local`
 */
AWS.config = new AWS.Config();

// Get the credentials from ~/.aws/credentials
// This doesn't work unless I set process.env.AWS_PROFILE, even though according to
// https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html
// it should be enough to just pass {profile: 'membership'} to SharedIniFileCredentials.
process.env.AWS_PROFILE = 'membership';
const credentials = new AWS.SharedIniFileCredentials({profile: 'membership'});

AWS.config.credentials = credentials;
AWS.config.region = 'eu-west-1';

async function run() {
    console.log(__dirname)
    process.env.Stage = 'DEV';

    const event = { body: JSON.stringify(input)}

    await handler(event, null)
        .then(result => {
            console.log('============================');
            console.log('Result: ', result);
        })
        .catch(err => {
            console.log('============================');
            console.log('Failed to run locally: ', err);
        })
}

run();
