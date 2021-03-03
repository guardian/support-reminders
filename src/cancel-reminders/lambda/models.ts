import {
	createDetailedValidator,
	registerType,
} from 'typecheck.macro/dist/typecheck.macro';

export interface CancellationRequest {
	reminder_code: string;
}

registerType('CancellationRequest');
export const cancellationValidator = createDetailedValidator<CancellationRequest>();
