import { Pool, QueryConfig, QueryResult } from 'pg';
import { logInfo } from './log';

export type DBConfig = {
	username: string;
	url: string;
	password: string;
};

export function createDatabaseConnectionPool(dbConfig: DBConfig): Pool {
	const match = /\/\/(.*)\/(.*)/.exec(dbConfig.url);
	if (match !== null) {
		const [, host, database] = match;
		return new Pool({
			host,
			database,
			user: dbConfig.username,
			password: dbConfig.password,

			port: 5432,
			idleTimeoutMillis: 0,
		});
	}

	throw new Error(`Could not parse DB config ${JSON.stringify(dbConfig)}`);
}

export function runWithLogging(
	queryConfig: QueryConfig,
	pool: Pool,
): Promise<QueryResult> {
	return pool.query(queryConfig).then((result: QueryResult) => {
		logInfo(
			`Query: ${JSON.stringify(queryConfig)}. Affected ${
				result.rowCount
			} row(s): `,
			result.rows,
		);
		return result;
	});
}
