interface PlayerCredentials {
	playerId: string;
	token: string;
}

export interface CreatedRoom extends PlayerCredentials {
	roomId: string;
}

async function readResponse<T>(response: Response): Promise<T> {
	const body: unknown = await response.json().catch(() => undefined);
	if (!response.ok) {
		const message =
			typeof body === "object" &&
			body !== null &&
			"error" in body &&
			typeof body.error === "string"
				? body.error
				: "通信に失敗しました";
		throw new Error(message);
	}
	return body as T;
}

export async function createRoom(hostName: string): Promise<CreatedRoom> {
	const response = await fetch("/api/rooms", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ hostName }),
	});
	return readResponse<CreatedRoom>(response);
}

export async function joinRoom(
	roomId: string,
	name: string,
): Promise<PlayerCredentials> {
	const response = await fetch(
		`/api/rooms/${encodeURIComponent(roomId)}/join`,
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name }),
		},
	);
	return readResponse<PlayerCredentials>(response);
}
