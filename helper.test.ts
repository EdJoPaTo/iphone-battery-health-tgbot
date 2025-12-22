import { deepStrictEqual } from "node:assert";
import { test } from "node:test";
import { pick, sortBy, sortByLocale } from "./helper.ts";

test("sortBy works", () => {
	const input = [1, 3, 2];
	const sorted = input.sort(sortBy((entry) => entry));
	deepStrictEqual(sorted, [1, 2, 3]);
});

test("sortByLocale works", () => {
	const input = ["a", "c", "b"];
	const sorted = input.sort(sortByLocale((entry) => entry));
	deepStrictEqual(sorted, ["a", "b", "c"]);
});

test("pick works", () => {
	const input = { a: 1, b: 2, c: 3 };
	const picked = pick(input, "a", "c");
	deepStrictEqual(picked, { a: 1, c: 3 });
});
