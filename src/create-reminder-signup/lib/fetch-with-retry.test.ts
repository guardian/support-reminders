import { Response } from 'node-fetch';
import { fetchWithRetry } from './fetch-with-retry';

describe('fetchWithRetry', () => {
	it('retries the fetcher if it fails', async () => {
		const numFails = 1;
		const maxRetries = 5;
		const expectedNumTries = 2;
		const fetcher = getMockFetcher(numFails);

		await fetchWithRetry(fetcher, maxRetries);

		expect(fetcher).toHaveBeenCalledTimes(expectedNumTries);
	});

	it('only retries maxRetries times', async () => {
		const numFails = 5;
		const maxRetries = 1;
		const expectedNumTries = 2;
		const fetcher = getMockFetcher(numFails);

		await fetchWithRetry(fetcher, maxRetries);

		expect(fetcher).toHaveBeenCalledTimes(expectedNumTries);
	});
});

function getMockFetcher(numFails: number) {
	let numTries = 0;

	const fetcher = jest.fn(() => {
		const status = numTries < numFails ? 500 : 200;
		const response = new Response(undefined, { status });
		numTries++;
		return Promise.resolve(response);
	});

	return fetcher;
}
