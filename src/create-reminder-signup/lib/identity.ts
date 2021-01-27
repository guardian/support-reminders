import fetch from 'node-fetch';
import { isProd } from '../../lib/stage';

const idapiBaseUrl = isProd()
	? 'https://idapi.theguardian.com'
	: 'https://idapi.code.dev-theguardian.com';

const encodeEmail = (email: string): string =>
	encodeURI(email).replace('+', '%2B');

interface IdentitySuccess {
	name: 'success';
	identityId: string;
}
interface IdentityFailure {
	name: 'failure';
	status: number;
}
const fail = (status: number): IdentityFailure => ({ name: 'failure', status });

export type IdentityResult = IdentitySuccess | IdentityFailure;

export const getIdentityIdByEmail = async (
	email: string,
	accessToken: string,
): Promise<IdentityResult> => {
	const response = await fetch(
		`${idapiBaseUrl}/user?emailAddress=${encodeEmail(email)}`,
		{
			headers: { 'X-GU-ID-Client-Access-Token': `Bearer ${accessToken}` },
		},
	);

	if (!response.ok) {
		return fail(response.status);
	}

	return response.json().then((identityResponse) => {
		if (identityResponse.user?.id) {
			return {
				name: 'success',
				identityId: identityResponse?.user?.id as string,
			};
		} else {
			return fail(500);
		}
	});
};
