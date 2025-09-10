import { SSMClient } from '@aws-sdk/client-ssm';
import { createDatabaseConnectionPool } from '../../lib/db';
import { getDatabaseParamsFromSSM } from '../../lib/ssm';
import { uploadAsCsvToS3 } from '../../lib/upload';
import { getNextReminders } from '../lib/db';

const ssm = new SSMClient({ region: 'eu-west-1' });

const S3_KEY = `next-reminders/next-reminders.csv`;
const S3_BUCKET = process.env.Bucket ?? '';

export const handler = async (): Promise<number> =>
	getDatabaseParamsFromSSM(ssm)
		.then(createDatabaseConnectionPool)
		.then(getNextReminders)
		.then((result) => uploadAsCsvToS3(result, S3_BUCKET, S3_KEY));
