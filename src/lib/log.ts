// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ignore
export function logError(msg: string, ...args: any[]): void {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- ignore
	console.error.apply(null, [`[ERROR] ${msg}`, ...args]);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ignore
export function logWarning(msg: string, ...args: any[]): void {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- ignore
	console.log.apply(null, [`[WARN] ${msg}`, ...args]);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ignore
export function logInfo(msg: string, ...args: any[]): void {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- ignore
	console.log.apply(null, [`[INFO] ${msg}`, ...args]);
}
