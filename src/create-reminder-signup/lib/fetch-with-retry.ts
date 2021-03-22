import { Response } from 'node-fetch';

export async function fetchWithRetry(
	fetcher: () => Promise<Response>,
	maxTries: number,
): Promise<Response> {
	let response = await fetcher();
	let numTries = 1;

	while (!response.ok && numTries < maxTries) {
		response = await fetcher();
		numTries++;
	}
	return response;
}
