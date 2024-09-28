import {
	type BatteryEntry,
	type Device,
	DEVICES,
	type IsoDate,
	load,
	save,
} from "https://raw.githubusercontent.com/EdJoPaTo/iPhoneBatteryHealth/refs/heads/main/data.ts";
import { existsSync } from "node:fs";

export { type BatteryEntry, type Device, DEVICES, type IsoDate };

const PATH = "data/data.yaml";

await pull();

async function git(...args: string[]): Promise<void> {
	const command = new Deno.Command("git", { args });
	const process = command.spawn();
	const status = await process.status;
	if (!status.success) {
		throw new Error(`git was not successful`);
	}
}

export async function pull(): Promise<void> {
	if (existsSync("data/.git")) {
		await git("-C", "data", "pull", "--rebase");
	} else {
		await git(
			"clone",
			"-q",
			"--depth=1",
			"git@github.com:EdJoPaTo/iPhoneBatteryHealth.git",
			"data",
		);
	}
}

async function commit(
	message: string,
	batteries: BatteryEntry[],
): Promise<void> {
	await save(PATH, { batteries });
	await git("-C", "data", "add", "data.yaml");
	await git("-C", "data", "commit", "--message=" + message);
	await git("-C", "data", "push");
}

export async function getEntries(
	owner: string,
): Promise<ReadonlyArray<BatteryEntry>> {
	const all = await load(PATH);
	return all.filter((entry) => entry.owner === owner);
}

export async function getEntry(
	owner: string,
	device: Device,
	age: IsoDate,
): Promise<BatteryEntry | undefined> {
	const all = await load(PATH);
	return all.find((entry) =>
		entry.owner === owner &&
		entry.device === device &&
		entry.age === age
	);
}

export async function update(entry: BatteryEntry): Promise<void> {
	let message: string;
	await pull();
	const batteries = await load(PATH);
	const before = batteries.find((value) =>
		value.owner === entry.owner &&
		value.device === entry.device &&
		value.age === entry.age
	);
	if (before) {
		before.health = entry.health;
		before.warningSince = entry.warningSince;
		if (!before.warningSince) delete before.warningSince;
		message = `feat(data): update ${entry.owner} ${entry.device}`;
	} else {
		batteries.push(entry);
		message = `feat(data): add ${entry.owner} ${entry.device}`;
	}
	await commit(message, batteries);
}
