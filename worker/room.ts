import { DurableObject } from "cloudflare:workers";
import { createInitBoardData } from "./lib/board";
import type { GameState } from "./lib/game";
import { createPlayer } from "./lib/player";

export class GameRoom extends DurableObject {
	async getState(): Promise<GameState | undefined> {
		return await this.ctx.storage.get<GameState>("state");
	}

	async initRoom(hostPlayerName: string) {
		const current = await this.getState();

		if (current) {
			throw new Error("Room already exists");
		}

		const { player, rawToken } = await createPlayer(hostPlayerName, "host");

		const state: GameState = {
			status: "waiting",
			players: [player],
			board: createInitBoardData(),
			lastActivityAt: Date.now(),
		};

		await this.ctx.storage.put("state", state);

		return {
			playerId: player.id,
			token: rawToken,
		};
	}

	async deleteRoom(): Promise<void> {
		await this.ctx.storage.deleteAll();
	}
}
