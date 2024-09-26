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
		await git("-C", "data", "pull");
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

export async function getDevices(
	owner: string,
): Promise<ReadonlyArray<Device>> {
	const all = await load(PATH);
	return all.filter((entry) => entry.owner === owner).map((entry) =>
		entry.device
	);
}

export async function getEntry(
	owner: string,
	device: Device,
): Promise<BatteryEntry | undefined> {
	const all = await load(PATH);
	return all.find((entry) => entry.owner === owner && entry.device === device);
}

export async function update(entry: BatteryEntry): Promise<void> {
	let message: string;
	await pull();
	const batteries = await load(PATH);
	const before = batteries.find((value) =>
		value.owner === entry.owner && value.device === entry.device
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
