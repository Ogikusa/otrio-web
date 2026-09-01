import { DurableObject } from "cloudflare:workers";

export type GameStatus = "waiting" | "ready" | "playing";

export interface Player {
	id: string;
	tokenHash: string;
	name: string;
}

export interface GameState {
	status: GameStatus;
	hostPlayerId: string;
	player: Player[];
}

function createInitialState(): GameState {
	return {
		status: "waiting",
		hostPlayerId: crypto.randomUUID(),
		player: [],
	};
}

export class GameRoom extends DurableObject {
	async getState(): Promise<GameState> {
		return (
			(await this.ctx.storage.get<GameState>("state")) ?? createInitialState()
		);
	}

	async setState(state: GameState): Promise<void> {
		await this.ctx.storage.put("state", state);
	}
}
