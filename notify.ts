import { USERS } from "./config.ts";
import * as data from "./data.ts";

const MILLISECONDS_PER_MINUTE = 1000 * 60;
const MILLISECONDS_PER_HOUR = MILLISECONDS_PER_MINUTE * 60;
const MILLISECONDS_PER_DAY = MILLISECONDS_PER_HOUR * 24;

export async function* getIdsToNotify(): AsyncGenerator<number, void, unknown> {
	await data.pull();

	for (const { id, name } of USERS) {
		// deno-lint-ignore no-await-in-loop
		const needsNotification = await hasUpdatedRecently(name);

		if (needsNotification) {
			yield id;
		}
	}
}

async function hasUpdatedRecently(owner: string): Promise<boolean> {
	const entries = await data.getEntries(owner);
	const timestamps = entries
		.flatMap((entry) => Object.keys(entry.health));

	const daysAgo = timestamps.map((timestamp) =>
		(Date.now() - Date.parse(timestamp)) / MILLISECONDS_PER_DAY
	);

	/// Any less than 25 days ago
	const wasUpdatedRecently = daysAgo.some((o) => o < 25);

	return !wasUpdatedRecently;
}
