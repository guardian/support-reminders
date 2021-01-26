import type { Response as FetchResponse } from 'node-fetch';
import fetch from 'node-fetch';
import { isProd } from '../../lib/stage';

const idapiBaseUrl = isProd()
	? 'https://idapi.theguardian.com'
	: 'https://idapi.code.dev-theguardian.com';

const encodeEmail = (email: string): string =>
	encodeURI(email).replace('+', '%2B');

export function getIdentityIdByEmail(
	email: string,
	accessToken: string,
): Promise<string> {
	return fetch(`${idapiBaseUrl}/user?emailAddress=${encodeEmail(email)}`, {
		headers: { 'X-GU-ID-Client-Access-Token': `Bearer ${accessToken}` },
	})
		.then((response: FetchResponse) => {
			if (response.status == 404) {
				return Promise.reject(new Error(`Email not found: ${email}`));
			}
			if (!response.ok) {
				return Promise.reject(
					new Error(
						`Identity API user endpoint responded with status: ${response.status}`,
					),
				);
			}
			return response.json();
		})
		.then((identityResponse) => {
			if (identityResponse.user?.id) {
				console.log('identityResponse: ', identityResponse as string);

				return Promise.resolve(identityResponse?.user?.id as string);
			} else {
				return Promise.reject(
					`Missing brazeUuid in identity API response: ${JSON.stringify(
						identityResponse,
					)}`,
				);
			}
		});
}
