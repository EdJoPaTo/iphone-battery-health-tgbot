import { Bot, session } from "grammy";
import { html as format } from "npm:telegram-format@3";
import { getName } from "./config.ts";
import type { MyContext } from "./my-context.ts";

const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
if (!BOT_TOKEN) throw new Error("requires BOT_TOKEN env variable");

const baseBot = new Bot<MyContext>(BOT_TOKEN);

baseBot.command(
	"privacy",
	(ctx) =>
		ctx.reply(
			"This bot edits https://github.com/EdJoPaTo/iPhoneBatteryHealth so its data is public. Users that are listed in a config can interact with this bot. When you are not listed you are ignored and dont appear in any logs. When you are listed some data is stored in memory until the bot restarts. The bot source code is here: https://github.com/EdJoPaTo/iphone-battery-health-tgbot",
			{ link_preview_options: { is_disabled: true } },
		),
);

baseBot.use(session());

const bot = baseBot.errorBoundary(async ({ error, ctx }) => {
	if (error instanceof Error && error.message.includes("Too Many Requests")) {
		console.warn("grammY Too Many Requests error. Skip.", error);
		return;
	}

	console.error(
		"try to send error to user",
		ctx.update,
		error,
		// deno-lint-ignore no-explicit-any
		(error as any)?.on?.payload,
	);
	let text = `🔥 Da ist wohl ein Fehler aufgetreten…

Schreib mal @EdJoPaTo dazu an oder erstell ein ${
		format.url(
			"Issue auf GitHub",
			"https://github.com/EdJoPaTo/iphone-battery-health-tgbot/issues",
		)
	}. Dafür findet sich sicher eine Lösung. ☺️

Error: `;

	const errorText = error instanceof Error ? error.message : String(error);
	text += format.monospace(errorText.replaceAll(BOT_TOKEN, ""));

	await ctx.reply(text, {
		link_preview_options: { is_disabled: true },
		parse_mode: format.parse_mode,
	});
});

bot.use(async (ctx, next) => {
	const id = ctx.from?.id;
	if (!id) return;

	const name = getName(id);
	if (name) {
		ctx.state = { owner: name };
		await next();
		return;
	}

	await ctx.reply(
		`There is no information about you so this bot ignores you. In case you think this is a mistake contact the admins and tell them your Telegram ID: ${
			format.monospace(String(id))
		}. There is no logging about this so you need to tell them yourself.`,
		{
			parse_mode: format.parse_mode,
		},
	);
});

bot.command("start", (ctx) => ctx.reply("Moin " + ctx.state.owner + "!"));

const COMMANDS = {
	start: "show the menu",
	privacy: "information about the data processing",
} as const;
await baseBot.api.setMyCommands(
	Object.entries(COMMANDS)
		.map(([command, description]) => ({ command, description })),
);

await baseBot.start({
	onStart(botInfo) {
		console.log(new Date(), "Bot starts as", botInfo.username);
	},
});
