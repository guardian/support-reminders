import {
	createDetailedValidator,
	registerType,
} from 'typecheck.macro/dist/typecheck.macro';
import { isValidEmail } from '../../lib/models';

export interface ReactivationRequest {
	reminder_code: string;
}

registerType('ReactivationRequest');
export const reactivationValidator = createDetailedValidator<ReactivationRequest>();
