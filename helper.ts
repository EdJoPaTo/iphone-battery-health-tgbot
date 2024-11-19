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

// adapted from https://stackoverflow.com/questions/47232518/write-a-typesafe-pick-function-in-typescript/60227013#60227013
export function pick<T extends object, K extends keyof T>(
	base: T,
	...keys: K[]
): Pick<T, K> {
	const entries = keys
		.filter((key) => Boolean(base[key]))
		.map((key) => [key, base[key]]);
	return Object.fromEntries(entries);
}
