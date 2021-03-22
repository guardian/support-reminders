import { Response } from 'node-fetch';

export async function fetchWithRetry(
	fetcher: () => Promise<Response>,
	maxTries: number,
): Promise<Response> {
	const response = await fetcher();
	if (!response.ok && maxTries > 1) {
		return fetchWithRetry(fetcher, maxTries - 1);
	}
	return response;
}
