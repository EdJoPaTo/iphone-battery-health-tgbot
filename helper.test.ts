import { assertEquals } from "jsr:@std/assert@1";
import { sortBy, sortByLocale } from "./helper.ts";

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
