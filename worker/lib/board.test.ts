import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitBoardData, GameBoard } from "./board.ts";

describe("GameBoard", () => {
	it("places a piece without mutating the source data", () => {
		const source = createInitBoardData();
		const board = new GameBoard(source);

		assert.equal(board.place(4, 1, 0), true);
		assert.equal(board.get(4, 1), 0);
		assert.equal(source[4][1], null);
		assert.equal(board.place(4, 1, 1), false);
	});

	it("rejects invalid positions and sizes", () => {
		const board = new GameBoard(createInitBoardData());
		assert.equal(board.place(-1, 0, 0), false);
		assert.equal(board.place(9, 0, 0), false);
		assert.equal(board.place(0, -1, 0), false);
		assert.equal(board.place(0, 3, 0), false);
	});

	it("counts used pieces by color and size", () => {
		const board = new GameBoard(createInitBoardData());
		board.place(0, 1, 0);
		board.place(1, 1, 0);
		board.place(2, 1, 1);
		assert.equal(board.count(0, 1), 2);
		assert.equal(board.count(1, 1), 1);
		assert.equal(board.count(0, 2), 0);
	});

	it("detects three pieces of the same size on a line", () => {
		const board = new GameBoard(createInitBoardData());
		for (const position of [0, 4, 8]) board.place(position, 2, 0);
		assert.equal(board.hasWon(0), true);
		assert.equal(board.hasWon(1), false);
	});

	it("detects concentric and ascending wins", () => {
		const concentric = new GameBoard(createInitBoardData());
		for (const size of [0, 1, 2]) concentric.place(4, size, 1);
		assert.equal(concentric.hasWon(1), true);

		const ascending = new GameBoard(createInitBoardData());
		ascending.place(0, 0, 2);
		ascending.place(1, 1, 2);
		ascending.place(2, 2, 2);
		assert.equal(ascending.hasWon(2), true);
	});
});
