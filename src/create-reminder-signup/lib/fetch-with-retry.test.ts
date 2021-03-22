import { Response } from 'node-fetch';
import { fetchWithRetry } from './fetch-with-retry';

describe('fetchWithRetry', () => {
	it('retries the fetcher if it fails', async () => {
		const numFails = 1;
		const maxTries = 5;
		const expectedNumTries = 2;
		const fetcher = getMockFetcher(numFails);

		await fetchWithRetry(fetcher, maxTries);

		expect(fetcher).toHaveBeenCalledTimes(expectedNumTries);
	});

	it('only retries maxTries times', async () => {
		const numFails = 5;
		const maxTries = 1;
		const expectedNumTries = 1;
		const fetcher = getMockFetcher(numFails);

		await fetchWithRetry(fetcher, maxTries);

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
