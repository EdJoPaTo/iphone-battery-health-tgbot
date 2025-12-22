import * as yaml from "@std/yaml";

interface Config {
	users: Readonly<Record<number, string>>;
}

const CONFIG: Readonly<Config> = yaml.parse(
	Deno.readTextFileSync("config.yaml"),
) as Config;

export function getName(id: number | undefined): string | undefined {
	if (!id) return undefined;
	return CONFIG.users[id];
}

type UserArrayEntry = {
	readonly id: number;
	readonly name: string;
};

export const USERS: readonly UserArrayEntry[] = Object.entries(CONFIG.users)
	.map(([id, name]) => ({ id: Number(id), name }));
