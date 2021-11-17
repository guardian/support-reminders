import { getCurrentReminderPeriod } from './utils';

describe('getCurrentReminderPeriod', () => {
	it('returns a valid current reminder period (yyyy-mm-01)', () => {
		const today = '2021-01-10';
		const expected = '2021-01-01';

		const actual = getCurrentReminderPeriod(new Date(today));

		expect(actual).toEqual(expected);
	});
});
