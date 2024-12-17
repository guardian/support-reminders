import * as IR from 'typecheck.macro/dist/IR';

export function isValidEmail(email: string): boolean {
	const re =
		/[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
	return re.test(email.toLowerCase());
}

export function emailIsShortEnoughForIdentity(email: string): boolean {
	// Identity’s guest creation endpoint errors if the provided email address
	// is more than 100 characters long
	return email.length <= 100;
}

export type ValidationErrors = Array<[string, unknown, IR.IR | string]>;
