import { ValidationErrors } from '../../lib/models';
import { oneOffSignupValidator, recurringSignupValidator } from './models';

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
		const validationErrors: ValidationErrors = [];
		const result = oneOffSignupValidator(
			oneOffSignupRequest,
			validationErrors,
		);
		expect(result).toBe(true);
		expect(validationErrors.length).toEqual(0);
	});

	it('accepts a good OneOffSignupRequest with no reminderOption', () => {
		const validationErrors: ValidationErrors = [];
		const result = oneOffSignupValidator(
			{ ...oneOffSignupRequest, reminderOption: undefined },
			validationErrors,
		);
		expect(result).toBe(true);
		expect(validationErrors.length).toEqual(0);
	});

	it('rejects a OneOffSignupRequest with invalid email', () => {
		const validationErrors: ValidationErrors = [];
		const result = oneOffSignupValidator(
			{ ...oneOffSignupRequest, email: 'notavalidemail' },
			validationErrors,
		);
		expect(result).toBe(false);
		expect(validationErrors.length).toEqual(1);
	});

	it('rejects a OneOffSignupRequest with a really long email', () => {
		const validationErrors: ValidationErrors = [];
		let email = '';
		for (let i = 0; i < 100; i++) {
			email += 'e';
		}
		email += '@gmail.com';

		const result = oneOffSignupValidator(
			{ ...oneOffSignupRequest, email },
			validationErrors,
		);
		expect(result).toBe(false);
		expect(validationErrors.length).toEqual(1);
	});

	it('rejects a OneOffSignupRequest with invalid reminderPeriod', () => {
		const validationErrors: ValidationErrors = [];
		const result = oneOffSignupValidator(
			{ ...oneOffSignupRequest, reminderPeriod: 'a' },
			validationErrors,
		);
		expect(result).toBe(false);
		expect(validationErrors.length).toEqual(1);
	});

	it('accepts a good RecurringSignupRequest', () => {
		const validationErrors: ValidationErrors = [];
		const result = recurringSignupValidator(
			recurringSignupRequest,
			validationErrors,
		);
		expect(result).toBe(true);
		expect(validationErrors.length).toEqual(0);
	});

	it('rejects a RecurringSignupRequest with invalid reminderFrequencyMonths', () => {
		const validationErrors: ValidationErrors = [];
		const result = recurringSignupValidator(
			{ ...recurringSignupRequest, reminderFrequencyMonths: 'a' },
			validationErrors,
		);
		expect(result).toBe(false);
		expect(validationErrors.length).toEqual(1);
	});
});
