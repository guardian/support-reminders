import { z } from 'zod';
import { isProd } from './stage';

const identityResponseSchema = z.object({
	user: z.object({
		id: z.string(),
	}),
});

export const idapiBaseUrl = isProd()
	? 'https://idapi.theguardian.com'
	: 'https://idapi.code.dev-theguardian.com';

const encodeEmail = (email: string): string =>
	encodeURI(email).replace(/\+/g, '%2B');

export interface IdentitySuccess {
	name: 'success';
	identityId: string;
}

//TODO: move to models?
export interface IdentityErrorMessage {
	message: string;
	description: string;
	context?: string;
}

//TODO: move to models?
export interface IdentityError {
	status: 'error';
	errors: IdentityErrorMessage[];
}

export interface IdentityFailure {
	name: 'failure';
	status: number;
	errorMessage?: IdentityError;
}
export type IdentityResult = IdentitySuccess | IdentityFailure;

export const success = (identityId: string): IdentitySuccess => ({
	name: 'success',
	identityId,
});

export const fail = (
	status: number,
	message?: IdentityError,
): IdentityFailure => ({
	name: 'failure',
	status,
	errorMessage: message,
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
		return response.json().then((body: IdentityError) => {
			console.log(
				`Unable to lookup identity ID for email ${email}`,
				response.status,
				body,
			);
			return fail(response.status, body);
		});
	}

	return response.json().then((identityResponse) => {
		const parseResult = identityResponseSchema.safeParse(identityResponse);
		if (parseResult.success) {
			const { id } = parseResult.data.user;
			return {
				name: 'success',
				identityId: id,
			} as IdentitySuccess;
		} else {
			console.log(
				`Missing identity ID in response from identity for email ${email}`,
				parseResult.error.message,
			);
			return fail(500);
		}
	});
};
