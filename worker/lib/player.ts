import { createToken, hashToken } from "./token";

export type PlayerRole = "host" | "guest";

export interface Player {
	id: string;
	tokenHash: string;
	name: string;
	role: PlayerRole;
}

export async function createPlayer(
	name: string,
	role: PlayerRole,
): Promise<{
	rawToken: string;
	player: Player;
}> {
	const id = crypto.randomUUID();
	const token = createToken();
	const tokenHash = await hashToken(token);

	return {
		rawToken: token,
		player: {
			id,
			tokenHash,
			name,
			role,
		},
	};
}
