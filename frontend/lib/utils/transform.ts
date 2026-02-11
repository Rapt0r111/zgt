export function cleanEmptyStrings<T extends object>(obj: T): Partial<T> {
	const result: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(obj)) {
		if (value !== "") {
			result[key] = value;
		}
	}

	return result as Partial<T>;
}
