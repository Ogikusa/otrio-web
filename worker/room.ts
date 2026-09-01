import { DurableObject } from "cloudflare:workers";
import { createInitBoardData } from "./lib/board";
import { type GameState, MAX_PLAYERS } from "./lib/game";
import { createPlayer } from "./lib/player";

export class GameRoom extends DurableObject {
	async getState(): Promise<GameState | undefined> {
		return await this.ctx.storage.get<GameState>("state");
	}

	async initRoom(hostPlayerName: string) {
		const current = await this.getState();

		if (current) {
			return { created: false as const };
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
			created: true as const,
			playerId: player.id,
			token: rawToken,
		};
	}

	async setState(state: GameState): Promise<void> {
		await this.ctx.storage.put("state", state);
	}

	async joinRoom(playerName: string) {
		const state = await this.getState();
		if (!state) return { joined: false as const, reason: "not_found" as const };
		if (state.status !== "waiting") {
			return { joined: false as const, reason: "already_started" as const };
		}
		if (state.players.length >= MAX_PLAYERS) {
			return { joined: false as const, reason: "full" as const };
		}

		const { player, rawToken } = await createPlayer(playerName, "guest");
		state.players.push(player);
		state.lastActivityAt = Date.now();
		await this.setState(state);
		return {
			joined: true as const,
			playerId: player.id,
			token: rawToken,
		};
	}

	async deleteRoom(): Promise<void> {
		await this.ctx.storage.deleteAll();
	}
}
