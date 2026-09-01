import type { BoardData } from "./board";
import type { Player } from "./player";

const ROOM_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_ID_LENGTH = 6;
export const MAX_PLAYERS = 4;

export function createRoomId(): string {
	const bytes = new Uint8Array(ROOM_ID_LENGTH);
	crypto.getRandomValues(bytes);

	return [...bytes]
		.map((byte) => ROOM_ID_CHARS[byte % ROOM_ID_CHARS.length])
		.join("");
}

export function isValidRoomId(value: string): boolean {
	return (
		value.length === ROOM_ID_LENGTH &&
		[...value].every((character) => ROOM_ID_CHARS.includes(character))
	);
}

export type GameStatus = "waiting" | "playing" | "finished";

export interface GameState {
	status: GameStatus;
	players: Player[];
	board: BoardData;
	lastActivityAt: number;
}
