import type { GameRoom } from "../worker/room";

declare module "cloudflare:workers" {
	interface ProvidedEnv {
		GAME_ROOM: DurableObjectNamespace<GameRoom>;
		ROOM_CREATE_RATE_LIMITER: RateLimit;
		ROOM_ACCESS_RATE_LIMITER: RateLimit;
	}
}
