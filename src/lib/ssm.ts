import {
	GetParameterCommand,
	GetParametersByPathCommand,
	SSMClient,
} from '@aws-sdk/client-ssm';
import type { DBConfig } from './db';
import { isProd, isRunningLocally } from './stage';

// locally, if process.env.Stage is not set, it will fetch CODE credentials from SSM
export const ssmStage = isProd() ? 'PROD' : 'CODE';

export async function getDatabaseParamsFromSSM(
	ssm: SSMClient,
): Promise<DBConfig> {
	const dbConfigPath = `/support-reminders/db-config/${ssmStage}`;

	const command = new GetParametersByPathCommand({
		Path: dbConfigPath,
		WithDecryption: true,
	});

	const ssmResponse = await ssm.send(command);

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

export async function getParamFromSSM(
	ssm: SSMClient,
	path: string,
): Promise<string> {
	const command = new GetParameterCommand({
		Name: path,
		WithDecryption: true,
	});

	const ssmResponse = await ssm.send(command);

	if (ssmResponse.Parameter && ssmResponse.Parameter.Value) {
		return ssmResponse.Parameter.Value;
	}

	throw new Error(`Could not get config from SSM path ${path}`);
}
