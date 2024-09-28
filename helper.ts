export function sortBy<T>(
	key: (entry: T) => number,
	reverse = false,
): (a: T, b: T) => number {
	if (reverse) {
		return (a, b) => key(b) - key(a);
	} else {
		return (a, b) => key(a) - key(b);
	}
}

export function sortByLocale<T>(
	key: (entry: T) => string,
	reverse = false,
): (a: T, b: T) => number {
	if (reverse) {
		return (a, b) => key(b).localeCompare(key(a));
	} else {
		return (a, b) => key(a).localeCompare(key(b));
	}
}
