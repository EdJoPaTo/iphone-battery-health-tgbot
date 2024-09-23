import * as yaml from "jsr:@std/yaml@1";

interface Config {
	users: Readonly<Record<number, string>>;
}

export const CONFIG: Readonly<Config> = yaml.parse(
	Deno.readTextFileSync("config.yaml"),
) as Config;

export function getName(id: number | undefined): string | undefined {
	if (!id) return undefined;
	return CONFIG.users[id];
}
