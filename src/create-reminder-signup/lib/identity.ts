import { z } from 'zod';
import {
	fail,
	getIdentityIdByEmail,
	idapiBaseUrl,
	IdentityResult,
	success,
} from '../../lib/identity';
import { ReminderStage } from '../lambda/models';
import { fetchWithRetry } from './fetch-with-retry';

const identityResponseSchema = z.object({
	guestRegistrationRequest: z.object({
		userId: z.string(),
	}),
});

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
		return response.json().then((body) => {
			console.log(
				'Identity guest account creation failed',
				response.status,
				body,
			);
			return fail(response.status, body);
		});
	}

	return response.json().then((identityResponse) => {
		const parseResult = identityResponseSchema.safeParse(identityResponse);
		if (parseResult.success) {
			const { userId } = parseResult.data.guestRegistrationRequest;
			return success(userId);
		} else {
			console.log(
				'Missing userId in identity response',
				parseResult.error.message,
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
