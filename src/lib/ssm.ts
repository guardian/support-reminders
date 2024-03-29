import type * as SSM from 'aws-sdk/clients/ssm';
import type { DBConfig } from './db';
import { isProd, isRunningLocally } from './stage';

// locally, if process.env.Stage is not set, it will fetch CODE credentials from SSM
export const ssmStage = isProd() ? 'PROD' : 'CODE';

export async function getDatabaseParamsFromSSM(ssm: SSM): Promise<DBConfig> {
	const dbConfigPath = `/support-reminders/db-config/${ssmStage}`;

	const ssmResponse = await ssm
		.getParametersByPath({
			Path: dbConfigPath,
			WithDecryption: true,
		})
		.promise();

	if (ssmResponse.Parameters) {
		const p = ssmResponse.Parameters;
		const url = p.find(({ Name }) => Name === `${dbConfigPath}/url`);
		const password = p.find(
			({ Name }) => Name === `${dbConfigPath}/password`,
		);
		const username = p.find(
			({ Name }) => Name === `${dbConfigPath}/username`,
		);

		if (
			url &&
			url.Value &&
			password &&
			password.Value &&
			username &&
			username.Value
		) {
			return {
				url: isRunningLocally()
					? 'jdbc:postgresql://localhost/contributions'
					: url.Value,
				password: password.Value,
				username: username.Value,
			};
		}
	}

	throw new Error(`Could not get config from SSM path ${dbConfigPath}`);
}

export async function getParamFromSSM(ssm: SSM, path: string): Promise<string> {
	const ssmResponse = await ssm
		.getParameter({
			Name: path,
			WithDecryption: true,
		})
		.promise();

	if (ssmResponse.Parameter && ssmResponse.Parameter.Value) {
		return ssmResponse.Parameter.Value;
	}

	throw new Error(`Could not get config from SSM path ${path}`);
}
