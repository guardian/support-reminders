import fetch from 'node-fetch';
import { isProd } from './stage';

export const idapiBaseUrl = isProd()
	? 'https://idapi.theguardian.com'
	: 'https://idapi.code.dev-theguardian.com';

const encodeEmail = (email: string): string =>
	encodeURI(email).replace('+', '%2B');

export interface IdentitySuccess {
	name: 'success';
	identityId: string;
}

export interface IdentityFailure {
	name: 'failure';
	status: number;
}
export type IdentityResult = IdentitySuccess | IdentityFailure;

export const success = (identityId: string): IdentitySuccess => ({
	name: 'success',
	identityId,
});

export const fail = (status: number): IdentityFailure => ({
	name: 'failure',
	status,
});

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
		return response.text().then((body) => {
			console.log(
				`Failed to get identity ID for email ${email}`,
				response.status,
				body,
			);
			return fail(response.status);
		});
	}

	return response.json().then((identityResponse) => {
		if (identityResponse?.user?.id) {
			return {
				name: 'success',
				identityId: identityResponse.user.id as string,
			};
		} else {
			console.log(
				`Missing identity ID in response from identity for email ${email}`,
				identityResponse,
			);
			return fail(500);
		}
	});
};
