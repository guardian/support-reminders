export async function fetchWithRetry(
	fetcher: () => Promise<Response>,
	maxRetries: number,
): Promise<Response> {
	const response = await fetcher();
	if (!response.ok && maxRetries > 0) {
		return fetchWithRetry(fetcher, maxRetries - 1);
	}
	return response;
}
