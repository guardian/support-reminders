import {
	createDetailedValidator,
	registerType,
} from 'typecheck.macro/dist/typecheck.macro';
import { isValidEmail } from '../../lib/models';

export interface Cancellation {
	identity_id: string;
}

type Email = string;
export interface CancellationRequest {
	email: Email;
}

registerType('CancellationRequest');
export const cancellationValidator = createDetailedValidator<CancellationRequest>(
	undefined,
	{
		constraints: {
			Email: (email: string) =>
				isValidEmail(email) ? null : 'Invalid email',
		},
	},
);
