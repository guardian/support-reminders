import * as AWS from 'aws-sdk';
import { createObjectCsvStringifier } from 'csv-writer';
import { QueryResult } from 'pg';

const s3 = new AWS.S3();

export function uploadAsCsvToS3(
	result: QueryResult,
	bucket: string,
	key: string,
): Promise<number> {
	const header = result.fields.map((field) => ({
		id: field.name,
		title: field.name,
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
		.then((s3Result) => {
			console.log('s3Result', s3Result)
			return result.rowCount
		});
}
