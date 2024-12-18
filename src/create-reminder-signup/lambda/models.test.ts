import {
	oneOffSignupRequestSchema,
	recurringSignupRequestSchema,
} from './models';

const oneOffSignupRequest = {
	email: 'test-reminders10@theguardian.com',
	reminderPeriod: '2021-01-01',
	reminderPlatform: 'WEB',
	reminderComponent: 'EPIC',
	reminderStage: 'PRE',
	reminderOption: 'us-eoy-2020-both',
};

const recurringSignupRequest = {
	email: 'test-reminders10@theguardian.com',
	reminderFrequencyMonths: 6,
	reminderPlatform: 'WEB',
	reminderComponent: 'THANKYOU',
	reminderStage: 'POST',
	reminderOption: '6-months',
};

describe('request validation', () => {
	it('accepts a good OneOffSignupRequest', () => {
		const result = oneOffSignupRequestSchema.safeParse(oneOffSignupRequest);
		expect(result.success).toBe(true);
	});

	it('accepts a good OneOffSignupRequest with no reminderOption', () => {
		const result = oneOffSignupRequestSchema.safeParse({
			...oneOffSignupRequest,
			reminderOption: undefined,
		});
		expect(result.success).toBe(true);
	});

	it('rejects a OneOffSignupRequest with invalid email', () => {
		const result = oneOffSignupRequestSchema.safeParse({
			...oneOffSignupRequest,
			email: 'notavalidemail',
		});
		expect(result.success).toBe(false);
		expect(result.error?.errors[0].message).toEqual('Invalid email');
	});

	it('rejects a OneOffSignupRequest with a really long email', () => {
		let email = '';
		for (let i = 0; i < 100; i++) {
			email += 'e';
		}
		email += '@gmail.com';

		const result = oneOffSignupRequestSchema.safeParse({
			...oneOffSignupRequest,
			email,
		});
		expect(result.success).toBe(false);
		expect(result.error?.errors[0].message).toEqual(
			'String must contain at most 100 character(s)',
		);
	});

	it('rejects a OneOffSignupRequest with invalid reminderPeriod', () => {
		const result = oneOffSignupRequestSchema.safeParse({
			...oneOffSignupRequest,
			reminderPeriod: 'a',
		});
		expect(result.success).toBe(false);
		expect(result.error?.errors[0].message).toEqual('Invalid date');
	});

	it('accepts a good RecurringSignupRequest', () => {
		const result = recurringSignupRequestSchema.safeParse(
			recurringSignupRequest,
		);
		expect(result.success).toBe(true);
	});

	it('rejects a RecurringSignupRequest with invalid reminderFrequencyMonths', () => {
		const result = recurringSignupRequestSchema.safeParse({
			...recurringSignupRequest,
			reminderFrequencyMonths: 'a',
		});
		expect(result.success).toBe(false);
		expect(result.error?.errors[0].message).toEqual(
			'Expected number, received string',
		);
	});
});
