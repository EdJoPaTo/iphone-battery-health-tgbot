import { StatelessQuestion } from "@grammyjs/stateless-question";
import { Composer } from "grammy";
import { createBackMainMenuButtons, deleteMenuFromContext, getMenuOfPath, MenuTemplate, replyMenuToContext } from "grammy-inline-menu";
import * as yaml from "jsr:@std/yaml@1";
import { html as format } from "npm:telegram-format@3";
import {
	type BatteryEntry,
	type Device,
	DEVICES,
	getEntries,
	getEntry,
	type IsoDate,
	update,
} from "./data.ts";
import { sortByLocale } from "./helper.ts";
import type { MyContext } from "./my-context.ts";

function isDevice(device: unknown): device is Device {
	if (typeof device !== "string") return false;
	const STRINGS = (DEVICES as unknown) as string[];
	return STRINGS.includes(device);
}
function isIsoDate(date: unknown): date is IsoDate {
	return typeof date === "string" && /\d{4}-\d{2}-\d{2}/.test(date);
}

async function getCurrentEntry(ctx: MyContext): Promise<BatteryEntry> {
	const matchgroup = Array.isArray(ctx.match) && ctx.match[1];
	if (!matchgroup) throw new Error("ctx.match is not a regex match");
	const [device, age] = matchgroup.split(" ");
	if (!isIsoDate(age)) throw new Error("ctx.match doesnt contain age");
	if (!isDevice(device)) throw new Error("ctx.match doesnt contain device");
	const entry = await getEntry(ctx.state.owner, device, age);
	if (!entry) throw new Error("no device of the user found");
	return entry;
}

export const bot = new Composer<MyContext>();

export const mainMenu = new MenuTemplate<MyContext>((ctx) =>
	`Moin ${ctx.state.owner}!\n\nSelect your device. With this bot you can not add new devices. Ask the admin for this.`
);

const deviceMenu = new MenuTemplate<MyContext>(async (ctx) => {
	const entry = await getCurrentEntry(ctx);
	const relevant = {
		owner: entry.owner,
		device: entry.device,
		age: entry.age,
		warningSince: entry.warningSince,
	};
	let text = format.monospaceBlock(yaml.stringify(relevant), "yaml");
	text += "\n\n";
	text +=
		"⚠️ Does the device show a warning and doesnt show Peak performance capability? When thats the case please send the admin a message about this. Then it can be added to the dataset as well.";
	return { text, parse_mode: format.parse_mode };
});

mainMenu.chooseIntoSubmenu("d", deviceMenu, {
	columns: 1,
	async choices(ctx) {
		const entries = await getEntries(ctx.state.owner);
		return entries
			.sort(sortByLocale((entry) => `${entry.age} ${entry.device}`, true))
			.map((entry) => `${entry.device} ${entry.age}`);
	},
	getCurrentPage: (ctx) => ctx.session.page,
	setPage(ctx, page) {
		ctx.session.page = page;
	},
});

const relativeHealthMenu = new MenuTemplate<MyContext>(async (ctx) => {
	const entry = await getCurrentEntry(ctx);
	const relevant = {
		owner: entry.owner,
		device: entry.device,
		age: entry.age,
		health: entry.health,
	};
	const text = format.monospaceBlock(yaml.stringify(relevant), "yaml");
	return { text, parse_mode: format.parse_mode };
});
relativeHealthMenu.choose("percent", {
	columns: 5,
	async choices(ctx) {
		const entry = await getCurrentEntry(ctx);
		const minimum = Math.min(...Object.values(entry.health));
		const result: string[] = [];
		for (let index = 0; index < 20; index++) {
			result.push(String(minimum - index));
		}
		return result;
	},
	async do(ctx, key) {
		const entry = await getCurrentEntry(ctx);
		const today = new Date().toISOString().substring(0, 10) as IsoDate;
		const percentage = Number(key);

		if (entry.health[today] !== percentage) {
			entry.health[today] = percentage;
			await update(entry);
		}

		return "..";
	},
});
relativeHealthMenu.manualRow(createBackMainMenuButtons());
deviceMenu.submenu("health", relativeHealthMenu, { text: "relative health" });

const cycleQuestion = new StatelessQuestion<MyContext>('cycles', async (ctx, path) => {
	const entry = await getCurrentEntry(ctx);
	const today = new Date().toISOString().substring(0, 10) as IsoDate;

	const input = Number(ctx.message.text);
	if (Number.isFinite(input) && Number.isSafeInteger(input) && input >= 0) {
		entry.cycles ??= {};
		if (entry.cycles[today] !== input) {
			entry.cycles[today] = input;
			await update(entry);
		}
	} else {
		await ctx.reply("doesnt look like a cycle count?");
	}

	await replyMenuToContext(cyclesMenu, ctx, path);
});
bot.use(cycleQuestion);
const cyclesMenu = new MenuTemplate<MyContext>(async (ctx) => {
	const entry = await getCurrentEntry(ctx);
	const relevant = {
		owner: entry.owner,
		device: entry.device,
		age: entry.age,
		cycles: entry.cycles ?? {},
	};
	const text = format.monospaceBlock(yaml.stringify(relevant), "yaml");
	return { text, parse_mode: format.parse_mode };
});
cyclesMenu.interact("question", {
	text: 'Enter',
	async do(ctx, path) {
		await cycleQuestion.replyWithHTML(ctx, 'Whats the current cycle count?', getMenuOfPath(path));
		await deleteMenuFromContext(ctx); // TODO: maybe only remove the buttons?
		return false;
	}
})
cyclesMenu.manualRow(createBackMainMenuButtons());
deviceMenu.submenu("cycles", cyclesMenu, { text: "cycles" });

deviceMenu.manualRow(createBackMainMenuButtons());
