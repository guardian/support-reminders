import { readFileSync } from 'fs';
import { createDatabaseConnectionPool, DBConfig } from '../lib/db';

export const config: DBConfig = {
	url: process.env.TEST_DB_URL ?? '',
	username: process.env.TEST_DB_USER ?? '',
	password: process.env.TEST_DB_PASSWORD ?? '',
};

const pool = createDatabaseConnectionPool(config);

beforeAll(() => {
	console.log("before")
	const initDatabase = async (): Promise<void> => {
		const query = readFileSync(
			'./sql/create-signups-tables.sql',
		).toString();

		console.log('querying')
		await pool.query(query);
		console.log('completed')
	};

	return initDatabase();
});

afterAll(() => {
	const cleanUpDatabase = async () => {
		await pool.end();
	};

	return cleanUpDatabase();
});

beforeEach(() => {
	const cleanUpDatabase = async () => {
		await pool.query(`
			TRUNCATE TABLE
				one_off_reminder_signups,
				recurring_reminder_signups
		`);
	};

	return cleanUpDatabase();
});
