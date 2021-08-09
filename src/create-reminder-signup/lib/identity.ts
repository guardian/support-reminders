import fetch from 'node-fetch';
import {
	fail,
	getIdentityIdByEmail,
	idapiBaseUrl,
	IdentityResult,
	success,
} from '../../lib/identity';
import { ReminderStage } from '../lambda/models';
import { fetchWithRetry } from './fetch-with-retry';

const IDENTITY_ACCOUNT_CREATION_MAX_RETRIES = 1;

const createIdentityAccount = async (
	email: string,
	accessToken: string,
): Promise<IdentityResult> => {
	const requestBody = {
		primaryEmailAddress: email,
	};

	const identityGuestRequest = {
		method: 'post',
		headers: { 'X-GU-ID-Client-Access-Token': `Bearer ${accessToken}` },
		body: JSON.stringify(requestBody),
	};

	const response = await fetchWithRetry(
		() => fetch(`${idapiBaseUrl}/guest`, identityGuestRequest),
		IDENTITY_ACCOUNT_CREATION_MAX_RETRIES,
	);
	if (!response.ok) {
		return response.text().then((body) => {
			console.log(
				'Identity guest account creation failed',
				response.status,
				body,
			);
			return fail(response.status);
		});
	}

	return response.json().then((identityResponse) => {
		if (identityResponse?.guestRegistrationRequest?.userId) {
			return success(
				identityResponse.guestRegistrationRequest.userId as string,
			);
		} else {
			console.log(
				'Missing userId in identity response',
				JSON.stringify(identityResponse),
			);
			return fail(500);
		}
	});
};

export const getOrCreateIdentityIdByEmail = async (
	email: string,
	reminderStage: ReminderStage,
	accessToken: string,
): Promise<IdentityResult> => {
	const result = await getIdentityIdByEmail(email, accessToken);

	if (
		result.name === 'failure' &&
		result.status === 404 &&
		reminderStage === 'PRE'
	) {
		return createIdentityAccount(email, accessToken);
	}
	return result;
};
