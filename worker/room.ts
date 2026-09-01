import { DurableObject } from "cloudflare:workers";
import { createInitBoardData, GameBoard, type PlayerColor } from "./lib/board";
import {
	type GameState,
	getPlayerColors,
	MAX_PLAYERS,
	toPublicGameState,
} from "./lib/game";
import { createPlayer } from "./lib/player";
import { hashToken } from "./lib/token";

interface SocketAttachment {
	playerId: string | null;
}

const ROOM_CLEANUP_GRACE_MS = 30 * 60 * 1000;

type ClientMessage =
	| { type: "auth"; token: string }
	| { type: "ping" }
	| { type: "start" }
	| { type: "reset" }
	| { type: "leave" }
	| { type: "kick"; playerId: string }
	| {
			type: "move";
			position: number;
			size: number;
			color: number;
			declareOtrio: boolean;
	  }
	| { type: "claimOtrio" };

function parseClientMessage(
	message: string | ArrayBuffer,
): ClientMessage | undefined {
	if (typeof message !== "string" || message.length > 1024) return;
	try {
		const value: unknown = JSON.parse(message);
		if (typeof value !== "object" || value === null || !("type" in value))
			return;
		if (value.type === "ping") return { type: "ping" };
		if (value.type === "start") return { type: "start" };
		if (value.type === "reset") return { type: "reset" };
		if (value.type === "leave") return { type: "leave" };
		if (
			value.type === "kick" &&
			"playerId" in value &&
			typeof value.playerId === "string"
		) {
			return { type: "kick", playerId: value.playerId };
		}
		if (value.type === "claimOtrio") return { type: "claimOtrio" };
		if (
			value.type === "move" &&
			"position" in value &&
			typeof value.position === "number" &&
			"size" in value &&
			typeof value.size === "number" &&
			"color" in value &&
			typeof value.color === "number" &&
			"declareOtrio" in value &&
			typeof value.declareOtrio === "boolean"
		) {
			return {
				type: "move",
				position: value.position,
				size: value.size,
				color: value.color,
				declareOtrio: value.declareOtrio,
			};
		}
		if (
			value.type === "auth" &&
			"token" in value &&
			typeof value.token === "string" &&
			value.token.length <= 128
		) {
			return { type: "auth", token: value.token };
		}
	} catch {
		return;
	}
}

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
			gamePlayerIds: [],
			currentPlayer: player.id,
			winnerId: null,
			otrioClaimLockedPlayerIds: [],
			board: createInitBoardData(),
			lastActivityAt: Date.now(),
		};

		await this.ctx.storage.put("state", state);
		await this.ctx.storage.setAlarm(Date.now() + ROOM_CLEANUP_GRACE_MS);

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
		if (state.players.length >= MAX_PLAYERS) {
			return { joined: false as const, reason: "full" as const };
		}

		const { player, rawToken } = await createPlayer(playerName, "guest");
		state.players.push(player);
		state.lastActivityAt = Date.now();
		await this.setState(state);
		this.broadcastState(state);
		return {
			joined: true as const,
			playerId: player.id,
			token: rawToken,
		};
	}

	async fetch(request: Request): Promise<Response> {
		if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
			return new Response("WebSocket upgrade required", { status: 426 });
		}
		if (!(await this.getState())) {
			return new Response("Room not found", { status: 404 });
		}

		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);
		server.serializeAttachment({ playerId: null } satisfies SocketAttachment);
		this.ctx.acceptWebSocket(server);
		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(
		ws: WebSocket,
		message: string | ArrayBuffer,
	): Promise<void> {
		const parsed = parseClientMessage(message);
		if (!parsed) {
			this.send(ws, { type: "error", message: "不正なメッセージです" });
			return;
		}

		const attachment = ws.deserializeAttachment() as SocketAttachment | null;
		if (!attachment?.playerId) {
			if (parsed.type !== "auth") {
				this.send(ws, { type: "error", message: "認証が必要です" });
				return;
			}
			await this.authenticateSocket(ws, parsed.token);
			return;
		}

		if (parsed.type === "ping") {
			this.send(ws, { type: "pong" });
			return;
		}
		if (parsed.type === "start") {
			await this.startGame(ws, attachment.playerId);
			return;
		}
		if (parsed.type === "reset") {
			await this.resetGame(ws, attachment.playerId);
			return;
		}
		if (parsed.type === "leave") {
			await this.removePlayer(
				ws,
				attachment.playerId,
				attachment.playerId,
				false,
			);
			return;
		}
		if (parsed.type === "kick") {
			await this.removePlayer(ws, attachment.playerId, parsed.playerId, true);
			return;
		}
		if (parsed.type === "move") {
			await this.makeMove(
				ws,
				attachment.playerId,
				parsed.position,
				parsed.size,
				parsed.color,
				parsed.declareOtrio,
			);
			return;
		}
		if (parsed.type === "claimOtrio") {
			await this.claimOtrio(ws, attachment.playerId);
			return;
		}
		this.send(ws, { type: "error", message: "すでに認証済みです" });
	}

	async webSocketClose(): Promise<void> {
		await this.scheduleCleanupIfEmpty();
	}

	async webSocketError(): Promise<void> {
		await this.scheduleCleanupIfEmpty();
	}

	async alarm(): Promise<void> {
		if (this.hasAuthenticatedSockets()) {
			await this.ctx.storage.deleteAlarm();
			return;
		}

		const state = await this.getState();
		if (!state) return;
		const inactiveFor = Date.now() - state.lastActivityAt;
		if (inactiveFor < ROOM_CLEANUP_GRACE_MS) {
			await this.ctx.storage.setAlarm(
				state.lastActivityAt + ROOM_CLEANUP_GRACE_MS,
			);
			return;
		}

		for (const socket of this.ctx.getWebSockets()) {
			socket.close(4004, "Room expired");
		}
		await this.ctx.storage.deleteAll();
	}

	private async authenticateSocket(
		ws: WebSocket,
		token: string,
	): Promise<void> {
		const state = await this.getState();
		if (!state) {
			ws.close(4004, "Room not found");
			return;
		}

		const tokenHash = await hashToken(token);
		const player = state.players.find(
			(candidate) => candidate.tokenHash === tokenHash,
		);
		if (!player) {
			this.send(ws, { type: "error", message: "認証に失敗しました" });
			ws.close(4001, "Authentication failed");
			return;
		}

		ws.serializeAttachment({ playerId: player.id } satisfies SocketAttachment);
		await this.ctx.storage.deleteAlarm();
		state.lastActivityAt = Date.now();
		await this.setState(state);
		this.send(ws, { type: "authenticated", playerId: player.id });
		this.send(ws, { type: "state", state: toPublicGameState(state) });
	}

	private async startGame(ws: WebSocket, playerId: string): Promise<void> {
		const result = await this.ctx.storage.transaction(async (transaction) => {
			const state = await transaction.get<GameState>("state");
			if (!state) return { error: "ルームが見つかりません" };
			const player = state.players.find(
				(candidate) => candidate.id === playerId,
			);
			if (player?.role !== "host") return { error: "hostのみ開始できます" };
			if (state.status !== "waiting") return { error: "ゲームは開始済みです" };
			if (state.players.length < 2) return { error: "2人以上必要です" };

			state.status = "playing";
			state.gamePlayerIds = state.players.map(({ id }) => id);
			state.currentPlayer = state.gamePlayerIds[0];
			state.winnerId = null;
			state.otrioClaimLockedPlayerIds = [];
			state.lastActivityAt = Date.now();
			await transaction.put("state", state);
			return { state };
		});

		if ("error" in result) {
			this.send(ws, { type: "error", message: result.error });
			return;
		}
		this.broadcastState(result.state);
	}

	private async resetGame(ws: WebSocket, playerId: string): Promise<void> {
		const result = await this.ctx.storage.transaction(async (transaction) => {
			const state = await transaction.get<GameState>("state");
			if (!state) return { error: "ルームが見つかりません" };
			const player = state.players.find(
				(candidate) => candidate.id === playerId,
			);
			if (player?.role !== "host") return { error: "hostのみリセットできます" };

			state.status = "waiting";
			state.gamePlayerIds = [];
			state.currentPlayer = state.players[0]?.id ?? "";
			state.winnerId = null;
			state.otrioClaimLockedPlayerIds = [];
			state.board = createInitBoardData();
			state.lastActivityAt = Date.now();
			await transaction.put("state", state);
			return { state };
		});

		if ("error" in result) {
			this.send(ws, { type: "error", message: result.error });
			return;
		}
		this.broadcastState(result.state);
	}

	private async removePlayer(
		ws: WebSocket,
		requesterId: string,
		targetId: string,
		isKick: boolean,
	): Promise<void> {
		const result = await this.ctx.storage.transaction(async (transaction) => {
			const state = await transaction.get<GameState>("state");
			if (!state) return { error: "ルームが見つかりません" };
			const requester = state.players.find(({ id }) => id === requesterId);
			const target = state.players.find(({ id }) => id === targetId);
			if (!target) return { error: "playerが見つかりません" };
			if (isKick && requester?.role !== "host") {
				return { error: "hostのみキックできます" };
			}
			if (isKick && requesterId === targetId) {
				return { error: "自分自身は退出ボタンから退出してください" };
			}

			const wasPlaying = this.getGamePlayerIds(state).includes(targetId);
			state.players = state.players.filter(({ id }) => id !== targetId);
			state.otrioClaimLockedPlayerIds = (
				state.otrioClaimLockedPlayerIds ?? []
			).filter((id) => id !== targetId);

			if (state.players.length === 0) {
				await transaction.delete("state");
				return { deleted: true as const };
			}
			if (target.role === "host") state.players[0].role = "host";
			if (wasPlaying) {
				state.status = "waiting";
				state.gamePlayerIds = [];
				state.currentPlayer = state.players[0].id;
				state.winnerId = null;
				state.otrioClaimLockedPlayerIds = [];
				state.board = createInitBoardData();
			}
			state.lastActivityAt = Date.now();
			await transaction.put("state", state);
			return { state };
		});

		if ("error" in result) {
			this.send(ws, { type: "error", message: result.error });
			return;
		}
		const updatedState = "state" in result ? result.state : undefined;
		if (updatedState) this.broadcastState(updatedState);
		this.disconnectPlayer(
			targetId,
			isKick ? "ホストにキックされました" : "退出しました",
		);
	}

	private disconnectPlayer(playerId: string, reason: string): void {
		for (const socket of this.ctx.getWebSockets()) {
			const attachment =
				socket.deserializeAttachment() as SocketAttachment | null;
			if (attachment?.playerId !== playerId) continue;
			this.send(socket, { type: "removed", reason });
			socket.close(4003, reason);
		}
	}

	private hasAuthenticatedSockets(): boolean {
		return this.ctx.getWebSockets().some((socket) => {
			const attachment =
				socket.deserializeAttachment() as SocketAttachment | null;
			return (
				attachment?.playerId !== null && attachment?.playerId !== undefined
			);
		});
	}

	private async scheduleCleanupIfEmpty(): Promise<void> {
		if (this.hasAuthenticatedSockets()) return;
		if (!(await this.getState())) return;
		await this.ctx.storage.setAlarm(Date.now() + ROOM_CLEANUP_GRACE_MS);
	}

	private async makeMove(
		ws: WebSocket,
		playerId: string,
		position: number,
		size: number,
		requestedColor: number,
		declareOtrio: boolean,
	): Promise<void> {
		const result = await this.ctx.storage.transaction(async (transaction) => {
			const state = await transaction.get<GameState>("state");
			if (!state) return { error: "ルームが見つかりません" };
			if (state.status !== "playing")
				return { error: "ゲーム中ではありません" };
			if (state.currentPlayer !== playerId)
				return { error: "あなたのターンではありません" };

			const gamePlayerIds = this.getGamePlayerIds(state);
			const playerIndex = gamePlayerIds.indexOf(playerId);
			if (playerIndex < 0 || playerIndex > 3)
				return { error: "playerが不正です" };
			const ownedColors = getPlayerColors(playerIndex, gamePlayerIds.length);
			if (!ownedColors.includes(requestedColor as PlayerColor)) {
				return { error: "その色の駒は所有していません" };
			}
			const color = requestedColor as PlayerColor;
			const board = new GameBoard(state.board);
			if (!board.canPlace(position, size))
				return { error: "その穴には置けません" };
			if (board.count(color, size) >= 3)
				return { error: "そのサイズの駒は残っていません" };

			board.place(position, size, color);
			state.board = board.toData();
			state.lastActivityAt = Date.now();
			const hasDeclaredWin =
				declareOtrio &&
				ownedColors.some((ownedColor) => board.hasWon(ownedColor));
			if (hasDeclaredWin) {
				state.status = "finished";
				state.winnerId = playerId;
			} else {
				const nextPlayerId =
					gamePlayerIds[(playerIndex + 1) % gamePlayerIds.length];
				state.currentPlayer = nextPlayerId;
				state.otrioClaimLockedPlayerIds = (
					state.otrioClaimLockedPlayerIds ?? []
				).filter((id) => id !== nextPlayerId);
			}
			await transaction.put("state", state);
			return { state, otrioMissed: declareOtrio && !hasDeclaredWin };
		});

		if ("error" in result) {
			this.send(ws, { type: "error", message: result.error });
			return;
		}
		this.broadcastState(result.state);
		if (result.otrioMissed) {
			this.send(ws, {
				type: "notice",
				message:
					"「オートリオ！」と言いながら配置しましたが、勝利条件を満たしていませんでした。",
			});
		}
	}

	private async claimOtrio(ws: WebSocket, playerId: string): Promise<void> {
		const result = await this.ctx.storage.transaction(async (transaction) => {
			const state = await transaction.get<GameState>("state");
			if (!state) return { error: "ルームが見つかりません" };
			if (state.status !== "playing")
				return { error: "ゲーム中ではありません" };
			if (state.currentPlayer === playerId) {
				return { error: "自分のターンでは配置時に宣言してください" };
			}
			const lockedIds = state.otrioClaimLockedPlayerIds ?? [];
			if (lockedIds.includes(playerId)) {
				return { error: "次の自分のターンまで再宣言できません" };
			}

			const gamePlayerIds = this.getGamePlayerIds(state);
			const playerIndex = gamePlayerIds.indexOf(playerId);
			if (playerIndex < 0) return { error: "playerが不正です" };
			const board = new GameBoard(state.board);
			const hasWon = getPlayerColors(playerIndex, gamePlayerIds.length).some(
				(color) => board.hasWon(color),
			);
			state.lastActivityAt = Date.now();
			if (hasWon) {
				state.status = "finished";
				state.winnerId = playerId;
			} else {
				state.otrioClaimLockedPlayerIds = [...lockedIds, playerId];
			}
			await transaction.put("state", state);
			return { state, otrioMissed: !hasWon };
		});

		if ("error" in result) {
			this.send(ws, { type: "error", message: result.error });
			return;
		}
		this.broadcastState(result.state);
		if (result.otrioMissed) {
			this.send(ws, {
				type: "notice",
				message:
					"「オートリオ！」と宣言しましたが、あなたの色は勝利条件を満たしていませんでした。次の自分のターンまで再宣言できません。",
			});
		}
	}

	private getGamePlayerIds(state: GameState): string[] {
		return state.gamePlayerIds ?? state.players.map(({ id }) => id);
	}

	private broadcastState(state: GameState): void {
		const message = JSON.stringify({
			type: "state",
			state: toPublicGameState(state),
		});
		for (const ws of this.ctx.getWebSockets()) {
			const attachment = ws.deserializeAttachment() as SocketAttachment | null;
			if (attachment?.playerId) ws.send(message);
		}
	}

	private send(ws: WebSocket, message: unknown): void {
		ws.send(JSON.stringify(message));
	}

	async deleteRoom(): Promise<void> {
		await this.ctx.storage.deleteAll();
	}
}
