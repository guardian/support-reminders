import * as AWS from 'aws-sdk';
import * as SSM from 'aws-sdk/clients/ssm';
import { createObjectCsvStringifier } from 'csv-writer';
import { createDatabaseConnectionPool } from '../../lib/db';
import { getDatabaseParamsFromSSM } from '../../lib/ssm';
import { getNextReminders } from '../lib/db';

const ssm: SSM = new AWS.SSM({ region: 'eu-west-1' });
const s3 = new AWS.S3();

const S3_KEY = `next-reminders/next-reminders.csv`;
const S3_BUCKET = process.env.Bucket ?? '';

export const handler = async (): Promise<number> =>
	getDatabaseParamsFromSSM(ssm)
		.then((config) => createDatabaseConnectionPool(config))
		.then((pool) => getNextReminders(pool))
		.then((result) => {
			const csvWriter = createObjectCsvStringifier({
				header: [
					{ id: 'identity_id', title: 'identity_id' },
					{ id: 'reminder_period', title: 'reminder_period' },
					{ id: 'reminder_created_at', title: 'reminder_created_at' },
					{ id: 'reminder_platform', title: 'reminder_platform' },
					{ id: 'reminder_component', title: 'reminder_component' },
					{ id: 'reminder_stage', title: 'reminder_stage' },
					{ id: 'reminder_option', title: 'reminder_option' },
					{ id: 'reminder_type', title: 'reminder_type' },
				],
			});
			const header = csvWriter.getHeaderString();
			const records = csvWriter.stringifyRecords(result.rows);

			if (!header || !records) {
				return -1;
			}

			const body = `${header}${records}`;

			return s3
				.upload({
					Bucket: S3_BUCKET,
					Key: S3_KEY,
					Body: body,
					ACL: 'bucket-owner-full-control',
				})
				.promise()
				.then(() => result.rowCount);
		});
