import {
	createDetailedValidator,
	registerType,
} from 'typecheck.macro/dist/typecheck.macro';

export interface ReactivationRequest {
	reminder_code: string;
}

registerType('ReactivationRequest');
export const reactivationValidator = createDetailedValidator<ReactivationRequest>();
