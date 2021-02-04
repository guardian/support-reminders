import * as AWS from 'aws-sdk';
import { createObjectCsvStringifier } from 'csv-writer';
import { QueryResult } from 'pg';

const s3 = new AWS.S3();

export function uploadAsCsvToS3(
	result: QueryResult,
	bucket: string,
	key: string,
): Promise<number> {
	if (result.rowCount == 0) {
		return Promise.resolve(0);
	}

	const header = Object.keys(result.rows[0]).map((key) => ({
		id: key,
		title: key,
	}));

	const csvWriter = createObjectCsvStringifier({
		header,
	});

	const csvHeader = csvWriter.getHeaderString() ?? '';
	const csvRows = csvWriter.stringifyRecords(result.rows);
	const csv = `${csvHeader}${csvRows}`;

	return s3
		.upload({
			Bucket: bucket,
			Key: key,
			Body: csv,
			ACL: 'bucket-owner-full-control',
		})
		.promise()
		.then(() => result.rowCount);
}
