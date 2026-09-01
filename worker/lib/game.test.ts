import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRoomId, isValidRoomId } from "./game.ts";

describe("room IDs", () => {
	it("creates valid, shareable IDs", () => {
		for (let index = 0; index < 100; index++) {
			assert.equal(isValidRoomId(createRoomId()), true);
		}
	});

	it("rejects ambiguous, lowercase, and malformed IDs", () => {
		for (const value of ["ABC", "ABC10O", "abcdef", "ABC-23", "ABC2345"]) {
			assert.equal(isValidRoomId(value), false);
		}
	});
});
