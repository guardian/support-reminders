import {
	createDetailedValidator,
	registerType,
} from 'typecheck.macro/dist/typecheck.macro';
import { isValidEmail } from '../../lib/models';

export interface CancellationRequest {
	reminder_code: string;
}

registerType('CancellationRequest');
export const cancellationValidator = createDetailedValidator<CancellationRequest>();
