import { StatelessQuestion } from "@grammyjs/stateless-question";
import * as yaml from "@std/yaml";
import { Composer } from "grammy";
import {
	createBackMainMenuButtons,
	getMenuOfPath,
	MenuTemplate,
	replyMenuToContext,
} from "grammy-inline-menu";
import { InputFile } from "grammy/types";
import { html as format } from "telegram-format";
import { batteryDate } from "./battery-date.ts";
import {
	type BatteryEntry,
	type Device,
	DEVICES,
	getAllOfDevice,
	getEntries,
	getEntry,
	type IsoDate,
	update,
} from "./data.ts";
import { pick, sortByLocale } from "./helper.ts";
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

	if (matchgroup) {
		const [device, age] = matchgroup.split(" ");
		if (!isIsoDate(age)) throw new Error("ctx.match doesnt contain age");
		if (!isDevice(device)) throw new Error("ctx.match doesnt contain device");
		const entry = await getEntry(ctx.state.owner, device, age);
		if (!entry) throw new Error("no device of the user found");
		ctx.session.device = device;
		ctx.session.age = age;
		return entry;
	}

	const { device, age } = ctx.session;
	if (isDevice(device) && isIsoDate(age)) {
		const entry = await getEntry(ctx.state.owner, device, age);
		if (!entry) {
			delete ctx.session.device;
			delete ctx.session.age;
			throw new Error("no device of user found");
		}
		return entry;
	}

	throw new Error("no battery entry referenced in ctx.match or ctx.session");
}

export const bot = new Composer<MyContext>();

export const mainMenu = new MenuTemplate<MyContext>((ctx) =>
	`Moin ${ctx.state.owner}!\n\nSelect your device. With this bot you can not add new devices. Ask the admin for this.`
);

const deviceMenu = new MenuTemplate<MyContext>(async (ctx) => {
	const entry = await getCurrentEntry(ctx);
	if (Object.keys(entry.health).length > 1) {
		entry.health = Object.fromEntries(Object.entries(entry.health).slice(-1));
	}
	if (entry.cycles && Object.keys(entry.cycles).length > 1) {
		entry.cycles = Object.fromEntries(Object.entries(entry.cycles).slice(-1));
	}
	let text = format.monospaceBlock(yaml.stringify(entry), "yaml");
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
	const relevant = pick(entry, "owner", "device", "age", "health");
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
deviceMenu.submenu("health", relativeHealthMenu, {
	text: "✏️ relative health",
});

const cycleQuestion = new StatelessQuestion<MyContext>(
	"cycles",
	async (ctx, additionalState) => {
		const [path, device, age] = additionalState.split("#");
		if (!path) throw new Error("additionalState is fishy");
		if (!isIsoDate(age)) throw new Error("question doesnt contain age");
		if (!isDevice(device)) throw new Error("question doesnt contain device");
		const entry = await getEntry(ctx.state.owner, device, age);
		if (!entry) throw new Error("no device of the user found");
		ctx.session.device = device;
		ctx.session.age = age;

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
	},
);
bot.use(cycleQuestion);
const cyclesMenu = new MenuTemplate<MyContext>(async (ctx) => {
	const entry = await getCurrentEntry(ctx);
	const relevant = pick(entry, "owner", "device", "age", "cycles");
	let text =
		"Battery Cycles is shown on newer devices but can also be accessed on older devices from the Analytics Data (" +
		format.monospace("last_value_CycleCount") + ")\n\n";
	text += format.monospaceBlock(yaml.stringify(relevant), "yaml");
	return { text, parse_mode: format.parse_mode };
});
cyclesMenu.interact("question", {
	text: "Enter cycle count",
	async do(ctx, path) {
		const entry = await getCurrentEntry(ctx);
		const text =
			`What's the current cycle count of ${entry.device} ${entry.age}?`;
		const additionalState = [
			getMenuOfPath(path),
			entry.device,
			entry.age,
		].join("#");
		await cycleQuestion.replyWithHTML(ctx, text, additionalState);
		await ctx.editMessageReplyMarkup(undefined);
		return false;
	},
});
cyclesMenu.manualRow(createBackMainMenuButtons());
deviceMenu.submenu("cycles", cyclesMenu, { text: "✏️ cycles" });

const rawDataMenu = new MenuTemplate<MyContext>(async (ctx) => {
	const entry = await getCurrentEntry(ctx);
	const text = format.monospaceBlock(yaml.stringify(entry), "yaml");
	return { text, parse_mode: format.parse_mode };
});
rawDataMenu.url({
	text: "Raw data files on GitHub",
	url: "https://github.com/EdJoPaTo/iPhoneBatteryHealth/blob/main/data",
});
rawDataMenu.manualRow(createBackMainMenuButtons());
deviceMenu.submenu("raw", rawDataMenu, { text: "💾 raw data" });

const deviceGraphMenu = new MenuTemplate<MyContext>(async (ctx) => {
	const entry = await getCurrentEntry(ctx);
	const device = entry.device;

	const entries = await getAllOfDevice(device);
	const filepath = await batteryDate(device, entries);
	return {
		media: new InputFile(filepath),
		type: "photo",
		text: `Compare all ${device}`,
	};
});
deviceGraphMenu.manualRow(createBackMainMenuButtons());
deviceMenu.submenu("graph", deviceGraphMenu, { text: "📉 device graph" });

deviceMenu.manualRow(createBackMainMenuButtons());
