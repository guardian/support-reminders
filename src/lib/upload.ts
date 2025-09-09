import { S3 } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createObjectCsvStringifier } from 'csv-writer';
import { QueryResult } from 'pg';

const s3 = new S3();

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

	return new Upload({
		client: s3,

		params: {
			Bucket: bucket,
			Key: key,
			Body: csv,
			ACL: 'bucket-owner-full-control',
		},
	})
		.done()
		.then(() => result.rowCount ?? 0);
}
