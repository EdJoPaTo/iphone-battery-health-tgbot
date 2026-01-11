import {
	type BatteryEntry,
	type Device,
	DEVICES,
	type IsoDate,
	load,
	loadAll,
	save,
} from "battery-health-data";
import { existsSync } from "node:fs";

export { type BatteryEntry, type Device, DEVICES, type IsoDate };

/** The repository is `data` and contains a `data` folder */
const DATAPATH = "data/data";

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
	device: Device,
	message: string,
	batteries: BatteryEntry[],
): Promise<void> {
	await save(DATAPATH, device, batteries);
	await git("-C", "data", "add", "data/" + device + ".yaml");
	await git("-C", "data", "commit", "--message=" + message);
	await git("-C", "data", "push");
}

export function getAllOfDevice(
	device: Device,
): Promise<Array<BatteryEntry>> {
	return load(DATAPATH, device);
}

export async function getEntries(
	owner: string,
): Promise<Array<BatteryEntry>> {
	const all = await loadAll(DATAPATH);
	return all.filter((entry) => entry.owner === owner);
}

export async function getEntry(
	owner: string,
	device: Device,
	age: IsoDate,
): Promise<BatteryEntry | undefined> {
	const all = await load(DATAPATH, device);
	return all.find((entry) =>
		entry.owner === owner &&
		entry.age === age
	);
}

export async function update(entry: BatteryEntry): Promise<void> {
	let message: string;
	await pull();
	const batteries = await load(DATAPATH, entry.device);
	const before = batteries.find((value) =>
		value.owner === entry.owner &&
		value.age === entry.age
	);
	if (before) {
		before.health = entry.health;
		before.cycles = entry.cycles;
		before.warningSince = entry.warningSince;
		if (!before.warningSince) delete before.warningSince;
		if (Object.keys(before.cycles ?? {}).length === 0) delete before.cycles;
		message = `feat(data): update ${entry.owner} ${entry.device}`;
	} else {
		batteries.push(entry);
		message = `feat(data): add ${entry.owner} ${entry.device}`;
	}
	await commit(entry.device, message, batteries);
}
