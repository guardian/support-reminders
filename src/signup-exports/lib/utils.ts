export function getYesterday(): string {
	const now = new Date();
	const yesterday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate() - 1,
	);

	const year = yesterday.getFullYear().toString();
	const month = (yesterday.getMonth() + 1).toString().padStart(2, '0');
	const date = yesterday.getDate().toString().padStart(2, '0');

	return `${year}-${month}-${date}`;
}
