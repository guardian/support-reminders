import {
	createDetailedValidator,
	registerType,
} from 'typecheck.macro/dist/typecheck.macro';

export interface ReactivationRequest {
	reminderCode: string;
}

registerType('ReactivationRequest');
export const reactivationValidator = createDetailedValidator<ReactivationRequest>();
