export function isRunningLocally(): boolean {
	return process.env.Stage === 'DEV';
}

export function isProd(): boolean {
	return process.env.Stage === 'PROD' || process.env.STAGE === 'PROD';
}
