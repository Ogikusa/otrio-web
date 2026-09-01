import { createRoomId, isValidRoomId } from "./lib/game";
import type { GameRoom } from "./room";

export { GameRoom } from "./room";

interface Env {
	GAME_ROOM: DurableObjectNamespace<GameRoom>;
	ROOM_CREATE_RATE_LIMITER: RateLimit;
	ROOM_ACCESS_RATE_LIMITER: RateLimit;
}

const MAX_PLAYER_NAME_LENGTH = 24;
const MAX_ROOM_ID_ATTEMPTS = 8;

function readPlayerName(
	body: unknown,
	field: "hostName" | "name",
): string | undefined {
	if (typeof body !== "object" || body === null || !(field in body)) return;
	const value = (body as Record<string, unknown>)[field];
	if (typeof value !== "string") return;
	const name = value.trim();
	if (name.length === 0 || name.length > MAX_PLAYER_NAME_LENGTH) return;
	return name;
}

function error(message: string, status: number): Response {
	return Response.json({ error: message }, { status });
}

function rateLimitKey(request: Request, operation: string): string {
	return `${request.headers.get("cf-connecting-ip") ?? "unknown"}:${operation}`;
}

function tooManyRequests(): Response {
	return Response.json(
		{ error: "操作が多すぎます。しばらく待ってから再試行してください" },
		{ status: 429, headers: { "retry-after": "60" } },
	);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/api/rooms" && request.method === "POST") {
			const rateLimit = await env.ROOM_CREATE_RATE_LIMITER.limit({
				key: rateLimitKey(request, "create"),
			});
			if (!rateLimit.success) return tooManyRequests();
			const body: unknown = await request.json().catch(() => undefined);
			const hostName = readPlayerName(body, "hostName");
			if (!hostName) return error("名前は1〜24文字で入力してください", 422);

			for (let attempt = 0; attempt < MAX_ROOM_ID_ATTEMPTS; attempt++) {
				const roomId = createRoomId();
				const room = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomId));
				const result = await room.initRoom(hostName);
				if (result.created) {
					return Response.json(
						{ roomId, playerId: result.playerId, token: result.token },
						{ status: 201 },
					);
				}
			}
			return error("ルームを作成できませんでした", 503);
		}

		const roomMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)$/);
		if (roomMatch && request.method === "GET") {
			const rateLimit = await env.ROOM_ACCESS_RATE_LIMITER.limit({
				key: rateLimitKey(request, "lookup"),
			});
			if (!rateLimit.success) return tooManyRequests();
			const roomId = roomMatch[1].toUpperCase();
			if (!isValidRoomId(roomId)) return error("ルームIDが不正です", 400);
			const room = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomId));
			if (!(await room.roomExists())) {
				return error("ルームが見つかりません", 404);
			}
			return Response.json({ exists: true });
		}

		const joinMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/join$/);
		if (joinMatch && request.method === "POST") {
			const rateLimit = await env.ROOM_ACCESS_RATE_LIMITER.limit({
				key: rateLimitKey(request, "join"),
			});
			if (!rateLimit.success) return tooManyRequests();
			const roomId = joinMatch[1].toUpperCase();
			if (!isValidRoomId(roomId)) return error("ルームIDが不正です", 400);
			const body: unknown = await request.json().catch(() => undefined);
			const name = readPlayerName(body, "name");
			if (!name) return error("名前は1〜24文字で入力してください", 422);

			const room = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomId));
			const result = await room.joinRoom(name);
			if (!result.joined) {
				const responses = {
					not_found: ["ルームが見つかりません", 404],
					full: ["ルームは満員です", 409],
				} as const;
				const [message, status] = responses[result.reason];
				return error(message, status);
			}
			return Response.json(
				{ playerId: result.playerId, token: result.token },
				{ status: 200 },
			);
		}

		const webSocketMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/ws$/);
		if (webSocketMatch && request.method === "GET") {
			const rateLimit = await env.ROOM_ACCESS_RATE_LIMITER.limit({
				key: rateLimitKey(request, "websocket"),
			});
			if (!rateLimit.success) return tooManyRequests();
			const roomId = webSocketMatch[1].toUpperCase();
			if (!isValidRoomId(roomId)) return error("ルームIDが不正です", 400);
			if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
				return error("WebSocket upgradeが必要です", 426);
			}
			const room = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomId));
			return room.fetch(request);
		}
		return new Response("Not found", { status: 404 });
	},
};
