import fetch from 'node-fetch';
import { isProd } from '../../lib/stage';
import { ReminderStage } from '../lambda/models';

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
export type IdentityResult = IdentitySuccess | IdentityFailure;

const success = (identityId: string): IdentitySuccess => ({
	name: 'success',
	identityId,
});
const fail = (status: number): IdentityFailure => ({ name: 'failure', status });

const getIdentityIdByEmail = async (
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
		if (
			identityResponse &&
			identityResponse.user &&
			identityResponse.user.id
		) {
			return {
				name: 'success',
				identityId: identityResponse.user.id as string,
			};
		} else {
			return fail(500);
		}
	});
};

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

	const response = await fetch(`${idapiBaseUrl}/guest`, identityGuestRequest);
	if (!response.ok) {
		console.log(
			`Identity guest account creation failed with status ${response.status}`,
		);
		return fail(response.status);
	}

	return response.json().then((identityResponse) => {
		if (
			identityResponse &&
			identityResponse.guestRegistrationRequest &&
			identityResponse.guestRegistrationRequest.userId
		) {
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
