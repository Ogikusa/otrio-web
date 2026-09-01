import type { BoardData, PlayerColor } from "./board";
import type { Player, PlayerRole } from "./player";

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
	gamePlayerIds: string[];
	currentPlayer: string;
	winnerId: string | null;
	otrioClaimLockedPlayerIds: string[];
	board: BoardData;
	lastActivityAt: number;
}

export interface PublicPlayer {
	id: string;
	name: string;
	role: PlayerRole;
	colors: PlayerColor[];
	isPlaying: boolean;
}

export interface PublicGameState {
	status: GameStatus;
	players: PublicPlayer[];
	gamePlayerIds: string[];
	currentPlayer: string;
	winnerId: string | null;
	otrioClaimLockedPlayerIds: string[];
	board: BoardData;
}

export function toPublicGameState(state: GameState): PublicGameState {
	const gamePlayerIds =
		state.gamePlayerIds ??
		(state.status === "waiting" ? [] : state.players.map(({ id }) => id));
	const colorPlayerIds =
		state.status === "waiting"
			? state.players.map(({ id }) => id)
			: gamePlayerIds;
	return {
		status: state.status,
		players: state.players.map(({ id, name, role }) => {
			const gameIndex = colorPlayerIds.indexOf(id);
			const colors =
				gameIndex >= 0 ? getPlayerColors(gameIndex, colorPlayerIds.length) : [];
			return {
				id,
				name,
				role,
				colors,
				isPlaying: state.status !== "waiting" && gamePlayerIds.includes(id),
			};
		}),
		gamePlayerIds,
		currentPlayer: state.currentPlayer,
		winnerId: state.winnerId ?? null,
		otrioClaimLockedPlayerIds: state.otrioClaimLockedPlayerIds ?? [],
		board: state.board,
	};
}

export function getPlayerColors(
	playerIndex: number,
	playerCount: number,
): PlayerColor[] {
	if (playerCount === 2) {
		return playerIndex === 0 ? [0, 2] : [1, 3];
	}
	return [playerIndex as PlayerColor];
}
