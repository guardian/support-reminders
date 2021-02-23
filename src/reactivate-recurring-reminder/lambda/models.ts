import {
	createDetailedValidator,
	registerType,
} from 'typecheck.macro/dist/typecheck.macro';
import { isValidEmail } from '../../lib/models';

export interface Reactivation {
	identity_id: string;
}

type Email = string;
export interface ReactivationRequest {
	email: Email;
}

registerType('ReactivationRequest');
export const reactivationValidator = createDetailedValidator<ReactivationRequest>(
	undefined,
	{
		constraints: {
			Email: (email: string) =>
				isValidEmail(email) ? null : 'Invalid email',
		},
	},
);
