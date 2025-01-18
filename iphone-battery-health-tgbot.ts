import { Bot, session } from "grammy";
import { MenuMiddleware } from "grammy-inline-menu";
import { html as format } from "npm:telegram-format@3";
import { getName } from "./config.ts";
import { pull } from "./data.ts";
import { sleep } from "./helper.ts";
import { bot as menuRelatedMiddlewares, mainMenu } from "./menu.ts";
import type { MyContext } from "./my-context.ts";
import { getIdsToNotify } from "./notify.ts";

const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
if (!BOT_TOKEN) throw new Error("requires BOT_TOKEN env variable");

const baseBot = new Bot<MyContext>(BOT_TOKEN);

baseBot.command(
	"privacy",
	(ctx) =>
		ctx.reply(
			"This bot edits https://github.com/EdJoPaTo/iPhoneBatteryHealth so its data is public. Users that are listed in a config can interact with this bot. When you are not listed you are ignored and dont appear in any logs. When you are listed some data is stored in memory until the bot restarts. The bot source code is here: https://github.com/EdJoPaTo/iphone-battery-health-tgbot",
			{
				link_preview_options: { is_disabled: true },
				reply_markup: { remove_keyboard: true },
			},
		),
);

baseBot.use(session({ initial: () => ({}) }));

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
	let text = `🔥 Looks like an error happened…

Tell @EdJoPaTo about this or open an ${
		format.url(
			"Issue on GitHub",
			"https://github.com/EdJoPaTo/iphone-battery-health-tgbot/issues",
		)
	}. Let's fix this together. ☺️

Error: `;

	const errorText = error instanceof Error ? error.message : String(error);
	text += format.monospace(errorText.replaceAll(BOT_TOKEN, ""));

	await ctx.reply(text, {
		link_preview_options: { is_disabled: true },
		parse_mode: format.parse_mode,
		reply_markup: { remove_keyboard: true },
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

const menu = new MenuMiddleware<MyContext>("/", mainMenu);
bot.use(menuRelatedMiddlewares, menu);
bot.command("start", (ctx) => menu.replyToContext(ctx));

bot.command("pull", async (ctx) => {
	await pull();
	return ctx.reply("Pull successful.", {
		reply_markup: { remove_keyboard: true },
	});
});

const COMMANDS = {
	start: "show the menu",
	pull: "git pull the data repository for updated data",
	privacy: "information about the data processing",
} as const;
await baseBot.api.setMyCommands(
	Object.entries(COMMANDS)
		.map(([command, description]) => ({ command, description })),
);

await notify();
setInterval(notify, 1000 * 60 * 15); // every 15 minutes

async function notify(): Promise<void> {
	const now = new Date();
	if (now.getDate() !== 15) return;
	if (now.getHours() !== 3) return;
	if (now.getMinutes() >= 15) return;

	for await (const id of getIdsToNotify()) {
		console.log("notify", getName(id), id);
		try {
			await baseBot.api.sendMessage(id, "🔋👀😇 → /start");
		} catch (error) {
			console.error(
				"error while notify sendMessage",
				error instanceof Error ? error.message : error,
			);
		}
		await sleep(1000);
	}
	console.log("notify all done");
}

await baseBot.start({
	onStart(botInfo) {
		console.log(new Date(), "Bot starts as", botInfo.username);
	},
});
