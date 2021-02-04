import * as AWS from 'aws-sdk';
import * as SSM from 'aws-sdk/clients/ssm';
import { createDatabaseConnectionPool } from '../../lib/db';
import { getDatabaseParamsFromSSM } from '../../lib/ssm';
import { uploadAsCsvToS3 } from '../../lib/upload';
import { getCreatedOrCancelledSignupsFromYesterday } from '../lib/db';
import { getYesterday } from '../lib/utils';

const ssm: SSM = new AWS.SSM({ region: 'eu-west-1' });

const yesterday = getYesterday();
const S3_KEY = `one-off-signups/date=${yesterday}/one-off-signups.csv`;
const S3_BUCKET = process.env.Bucket ?? '';

export const handler = async (): Promise<number> =>
	getDatabaseParamsFromSSM(ssm)
		.then((config) => createDatabaseConnectionPool(config))
		.then((pool) => getCreatedOrCancelledSignupsFromYesterday(pool))
		.then((result) => uploadAsCsvToS3(result, S3_BUCKET, S3_KEY));
