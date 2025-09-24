import * as AWS from 'aws-sdk';
import * as SSM from 'aws-sdk/clients/ssm';
import { createDatabaseConnectionPool } from '../../lib/db';
import { getDatabaseParamsFromSSM } from '../../lib/ssm';
import { uploadAsCsvToS3 } from '../../lib/upload';
import { getNextReminders } from '../lib/db';

const ssm: SSM = new AWS.SSM({ region: 'eu-west-1' });

const S3_KEY = `next-reminders/next-reminders.csv`;
//const S3_BUCKET = process.env.Bucket ?? '';
const S3_BUCKET1 = 'ophan-raw-mm-copy-support-reminders';
const S3_BUCKET2 = 'ophan-raw-mm-copy2-support-reminders';

export const handler = async (): Promise<number[]> => {
	const write1: Promise<number> = getDatabaseParamsFromSSM(ssm)
		.then(createDatabaseConnectionPool)
		.then(getNextReminders)
		.then((result) => uploadAsCsvToS3(result, S3_BUCKET1, S3_KEY));

	const write2: Promise<number> = getDatabaseParamsFromSSM(ssm)
		.then(createDatabaseConnectionPool)
		.then(getNextReminders)
		.then((result) => uploadAsCsvToS3(result, S3_BUCKET2, S3_KEY));

	return Promise.all([write1, write2]);
};
