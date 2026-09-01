import type { BoardData } from "./board";
import type { Player } from "./player";

const ROOM_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_ID_LENGTH = 6;

export function createRoomId(): string {
	const bytes = new Uint8Array(ROOM_ID_LENGTH);
	crypto.getRandomValues(bytes);

	return [...bytes]
		.map((byte) => ROOM_ID_CHARS[byte % ROOM_ID_CHARS.length])
		.join("");
}

export type GameStatus = "waiting" | "ready" | "playing";

export interface GameState {
	status: GameStatus;
	players: Player[];
	board: BoardData;
	lastActivityAt: number;
}
