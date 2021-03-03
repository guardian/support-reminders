import {
	createDetailedValidator,
	registerType,
} from 'typecheck.macro/dist/typecheck.macro';

export interface CancellationRequest {
	reminderCode: string;
}

registerType('CancellationRequest');
export const cancellationValidator = createDetailedValidator<CancellationRequest>();
