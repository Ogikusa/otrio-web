export const PlayerColorRed: PlayerColor = 0;
export const PlayerColorBlue: PlayerColor = 1;
export const PlayerColorGreen: PlayerColor = 2;
export const PlayerColorPurple: PlayerColor = 3;
type PlayerColor = 0 | 1 | 2 | 3;

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
		this.boardData = boardData;
	}

	canPlace(position: number, size: PieceSize): boolean {
		if (!Number.isInteger(position) || position < 0 || position > 8) {
			return false;
		}
		return this.boardData[position][size] === null;
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
