import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitBoardData } from "./board.ts";
import {
	createRoomId,
	getPlayerColors,
	isValidRoomId,
	toPublicGameState,
} from "./game.ts";

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

describe("public game state", () => {
	it("assigns two colors to each player in a two-player game", () => {
		assert.deepEqual(getPlayerColors(0, 2), [0, 2]);
		assert.deepEqual(getPlayerColors(1, 2), [1, 3]);
		assert.deepEqual(getPlayerColors(2, 3), [2]);
	});

	it("does not expose player token hashes", () => {
		const publicState = toPublicGameState({
			status: "waiting",
			players: [
				{
					id: "player-1",
					name: "Alice",
					role: "host",
					tokenHash: "secret-hash",
				},
			],
			gamePlayerIds: [],
			currentPlayer: "player-1",
			winnerId: null,
			otrioClaimLockedPlayerIds: [],
			board: createInitBoardData(),
			lastActivityAt: 0,
		});

		assert.deepEqual(publicState.players, [
			{
				id: "player-1",
				name: "Alice",
				role: "host",
				colors: [0],
				isPlaying: false,
			},
		]);
		assert.equal(JSON.stringify(publicState).includes("secret-hash"), false);
	});

	it("keeps players who joined mid-game out of the current color roster", () => {
		const board = createInitBoardData();
		const publicState = toPublicGameState({
			status: "playing",
			players: [
				{ id: "one", name: "One", role: "host", tokenHash: "a" },
				{ id: "two", name: "Two", role: "guest", tokenHash: "b" },
				{ id: "waiting", name: "Waiting", role: "guest", tokenHash: "c" },
			],
			gamePlayerIds: ["one", "two"],
			currentPlayer: "one",
			winnerId: null,
			otrioClaimLockedPlayerIds: [],
			board,
			lastActivityAt: 0,
		});

		assert.deepEqual(publicState.players[0].colors, [0, 2]);
		assert.deepEqual(publicState.players[1].colors, [1, 3]);
		assert.deepEqual(publicState.players[2].colors, []);
		assert.equal(publicState.players[2].isPlaying, false);
	});
});
