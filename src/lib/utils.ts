export function getCurrentReminderPeriod(now: Date = new Date()): string {
	const year = now.getFullYear().toString();
	const month = (now.getMonth() + 1).toString().padStart(2, '0');

	return `${year}-${month}-01`;
}
