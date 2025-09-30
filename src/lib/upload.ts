import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createObjectCsvStringifier } from 'csv-writer';
import { QueryResult } from 'pg';

const s3 = new S3Client({ region: 'eu-west-1' });

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

	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		Body: csv,
	});

	return s3.send(command).then(() => result.rowCount ?? 0);
}
