import { createBackMainMenuButtons, MenuTemplate } from "grammy-inline-menu";
import * as yaml from "jsr:@std/yaml@1";
import { html as format } from "npm:telegram-format@3";
import {
	type BatteryEntry,
	type Device,
	DEVICES,
	getDevices,
	getEntry,
	type IsoDate,
	pull,
	update,
} from "./data.ts";
import type { MyContext } from "./my-context.ts";

function isDevice(device: unknown): device is Device {
	if (typeof device !== "string") return false;
	const STRINGS = (DEVICES as unknown) as string[];
	return STRINGS.includes(device);
}

function getCurrentDevice(ctx: MyContext): Device {
	if (Array.isArray(ctx.match) && isDevice(ctx.match[1])) {
		return ctx.match[1];
	}
	throw new Error("unknown device: " + String(ctx.match));
}
async function getCurrentEntry(ctx: MyContext): Promise<BatteryEntry> {
	const device = getCurrentDevice(ctx);
	const entry = await getEntry(ctx.state.owner, device);
	if (!entry) throw new Error("no device of the user found");
	return entry;
}

const updateDataButton = {
	text: "Pull Data Repo",
	async do() {
		await pull();
		return true;
	},
} as const;

export const mainMenu = new MenuTemplate<MyContext>((ctx) =>
	`Moin ${ctx.state.owner}!\n\nSelect your device. With this bot you can not add new devices. Ask the admin for this.`
);
mainMenu.interact("update", updateDataButton);

export const deviceMenu = new MenuTemplate<MyContext>(async (ctx) => {
	const entry = await getCurrentEntry(ctx);
	let text = format.monospaceBlock(yaml.stringify(entry), "yaml");
	text += "\n\n";
	text +=
		"⚠️ Does the device show a warning and doesnt show Peak performance capability? When thats the case please send the admin a message about this. Then it can be added to the data set as well.";
	return { text, parse_mode: format.parse_mode };
});
deviceMenu.interact("update", updateDataButton);

mainMenu.chooseIntoSubmenu("d", deviceMenu, {
	columns: 2,
	choices: (ctx) => getDevices(ctx.state.owner),
	getCurrentPage: (ctx) => ctx.session.page,
	setPage(ctx, page) {
		ctx.session.page = page;
	},
});

deviceMenu.choose("percent", {
	columns: 6,
	async choices(ctx) {
		const entry = await getCurrentEntry(ctx);
		const minimum = Math.min(...Object.values(entry.health));
		const result: string[] = [];
		for (let index = 0; index < 6; index++) {
			result.push(String(minimum - index));
		}
		return result;
	},
	async do(ctx, percentage) {
		const entry = await getCurrentEntry(ctx);
		const today = new Date().toISOString().substring(0, 10) as IsoDate;
		entry.health[today] = Number(percentage);
		await update(entry);
		return true;
	},
});

deviceMenu.manualRow(createBackMainMenuButtons());
