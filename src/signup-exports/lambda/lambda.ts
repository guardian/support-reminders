import { SSM } from '@aws-sdk/client-ssm';
import { createDatabaseConnectionPool } from '../../lib/db';
import { getDatabaseParamsFromSSM } from '../../lib/ssm';
import { uploadAsCsvToS3 } from '../../lib/upload';
import {
	getCreatedOrCancelledOneOffSignupsFromYesterday,
	getCreatedOrCancelledRecurringSignupsFromYesterday,
} from '../lib/db';
import { getYesterday } from '../lib/utils';

const ssm: SSM = new SSM({
	region: 'eu-west-1',
});

const yesterday = getYesterday();
const ONE_OFF_S3_KEY = `one-off-signups/date=${yesterday}/one-off-signups.csv`;
const RECURRING_S3_KEY = `recurring-signups/date=${yesterday}/recurring-signups.csv`;
const S3_BUCKET = process.env.Bucket ?? '';

export const handler = async (): Promise<number> => {
	const pool = await getDatabaseParamsFromSSM(ssm).then(
		createDatabaseConnectionPool,
	);

	const numOneOffs = await getCreatedOrCancelledOneOffSignupsFromYesterday(
		pool,
	).then((result) => uploadAsCsvToS3(result, S3_BUCKET, ONE_OFF_S3_KEY));

	const numRecurrings =
		await getCreatedOrCancelledRecurringSignupsFromYesterday(pool).then(
			(result) => uploadAsCsvToS3(result, S3_BUCKET, RECURRING_S3_KEY),
		);

	return numOneOffs + numRecurrings;
};
