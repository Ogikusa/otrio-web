import { DurableObject } from "cloudflare:workers";

export type GameStatus = "waiting" | "ready" | "playing";

export interface Player {
	id: string;
	name: string;
}

export interface GameState {
	status: GameStatus;
	player: Player[];
}

function createInitialState(): GameState {
	return {
		status: "waiting",
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
