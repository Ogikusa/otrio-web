import { createRoomId } from "./lib/game";
import type { GameRoom } from "./room";

export { GameRoom } from "./room";

interface Env {
	GAME_ROOM: DurableObjectNamespace<GameRoom>;
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/api/rooms" && request.method === "POST") {
			const body = await request.json();
			if (typeof body !== "object" || body === null) {
				return new Response("illegal body", { status: 400 });
			}

			if (
				!("hostPlayerName" in body) ||
				typeof body.hostPlayerName !== "string" ||
				body.hostPlayerName.trim().length === 0
			) {
				return new Response("illegal 'hostPlayerName' field", { status: 422 });
			}

			const hostPlayerName = body.hostPlayerName;

			// TODO 0.3%ぐらいの確率で衝突する
			const roomId = createRoomId();
			const DOID = env.GAME_ROOM.idFromName(roomId);
			const room = env.GAME_ROOM.get(DOID);
			const hostPlayerInfo = await room.initRoom(hostPlayerName);
			return Response.json({ roomId, ...hostPlayerInfo }, { status: 200 });
		}
		const match = url.pathname.match(/^\/api\/rooms\/([^/]+)$/);
		if (match && request.method === "GET") {
			const roomId = match[1];
			return Response.json({ roomId }, { status: 200 });
		}
		return new Response("Not found", { status: 404 });
	},
};
