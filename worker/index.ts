export { GameRoom } from "./room";

interface Env {
  GAME_ROOM: DurableObjectNamespace;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url)

		if (url.pathname === "/api/health"){
			return Response.json({
				"test": "ok!"
			});
		}
		return new Response("Not found", { status: 404 });
	},
}
