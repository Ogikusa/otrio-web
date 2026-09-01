export const PlayerColorRed: PlayerColor = 0;
export const PlayerColorBlue: PlayerColor = 1;
export const PlayerColorGreen: PlayerColor = 2;
export const PlayerColorPurple: PlayerColor = 3;
export type PlayerColor = 0 | 1 | 2 | 3;

type Hole = PlayerColor | null;

type BoardCell = [Hole, Hole, Hole];

// biome-ignore format: ボードを表しているため
export type BoardData = [
	BoardCell, BoardCell, BoardCell,
	BoardCell, BoardCell, BoardCell,
	BoardCell, BoardCell, BoardCell,
];

export type PieceSize = 0 | 1 | 2;

export const PieceSizeSmall: PieceSize = 0;
export const PieceSizeMedium: PieceSize = 1;
export const PieceSizeLarge: PieceSize = 2;

export class GameBoard {
	private boardData: BoardData;
	constructor(boardData: BoardData) {
		this.boardData = boardData.map((cell) => [...cell]) as BoardData;
	}

	canPlace(position: number, size: number): size is PieceSize {
		if (!Number.isInteger(position) || position < 0 || position > 8) {
			return false;
		}
		if (!Number.isInteger(size) || size < 0 || size > 2) {
			return false;
		}
		return this.boardData[position][size] === null;
	}

	place(position: number, size: number, color: PlayerColor): boolean {
		if (!this.canPlace(position, size)) {
			return false;
		}
		this.boardData[position][size] = color;
		return true;
	}

	get(position: number, size: number): PlayerColor | null | undefined {
		if (
			!Number.isInteger(position) ||
			position < 0 ||
			position > 8 ||
			!Number.isInteger(size) ||
			size < 0 ||
			size > 2
		) {
			return undefined;
		}
		return this.boardData[position][size];
	}

	toData(): BoardData {
		return this.boardData.map((cell) => [...cell]) as BoardData;
	}

	hasWon(color: PlayerColor): boolean {
		const lines = [
			[0, 1, 2],
			[3, 4, 5],
			[6, 7, 8],
			[0, 3, 6],
			[1, 4, 7],
			[2, 5, 8],
			[0, 4, 8],
			[2, 4, 6],
		] as const;

		if (this.boardData.some((cell) => cell.every((hole) => hole === color))) {
			return true;
		}

		return lines.some((line) => {
			for (const size of [0, 1, 2] as const) {
				if (
					line.every((position) => this.boardData[position][size] === color)
				) {
					return true;
				}
			}
			return (
				line.every(
					(position, index) => this.boardData[position][index] === color,
				) ||
				line.every(
					(position, index) => this.boardData[position][2 - index] === color,
				)
			);
		});
	}
}

export function createInitBoardData() {
	// biome-ignore format: ボードを表しているため
	const initBoard: BoardData = [
		[null, null, null], [null, null, null], [null, null, null],
		[null, null, null], [null, null, null], [null, null, null],
		[null, null, null], [null, null, null], [null, null, null],
	];
	return initBoard;
}
