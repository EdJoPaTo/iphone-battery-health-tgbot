import { assertEquals } from "jsr:@std/assert@1";
import { pick, sortBy, sortByLocale } from "./helper.ts";

Deno.test("sortBy works", () => {
	const input = [1, 3, 2];
	const sorted = input.sort(sortBy((entry) => entry));
	assertEquals(sorted, [1, 2, 3]);
});

Deno.test("sortByLocale works", () => {
	const input = ["a", "c", "b"];
	const sorted = input.sort(sortByLocale((entry) => entry));
	assertEquals(sorted, ["a", "b", "c"]);
});

Deno.test("pick works", () => {
	const input = { "a": 1, "b": 2, "c": 3 };
	const picked = pick(input, "a", "c");
	assertEquals(picked, { "a": 1, "c": 3 });
});
