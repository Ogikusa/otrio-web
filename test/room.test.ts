import { runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { GameState } from "../worker/lib/game";

function roomStub(label: string) {
	return env.GAME_ROOM.getByName(`${label}-${crypto.randomUUID()}`);
}

describe("GameRoom integration", () => {
	it("rate limits repeated room creation requests", async () => {
		const ip = `test-${crypto.randomUUID()}`;
		const statuses = await Promise.all(
			Array.from({ length: 6 }, () =>
				exports.default
					.fetch("https://example.com/api/rooms", {
						method: "POST",
						headers: {
							"content-type": "application/json",
							"cf-connecting-ip": ip,
						},
						body: JSON.stringify({ hostName: "Host" }),
					})
					.then((response) => response.status),
			),
		);
		expect(statuses.filter((status) => status === 201)).toHaveLength(5);
		expect(statuses.filter((status) => status === 429)).toHaveLength(1);
	});

	it("atomically limits concurrent joins to four total players", async () => {
		const room = roomStub("concurrent-join");
		const created = await room.initRoom("Host");
		expect(created.created).toBe(true);

		const results = await Promise.all(
			Array.from({ length: 8 }, (_, index) => room.joinRoom(`Guest ${index}`)),
		);
		expect(results.filter((result) => result.joined)).toHaveLength(3);
		expect(
			results.filter((result) => !result.joined && result.reason === "full"),
		).toHaveLength(5);

		await runInDurableObject(room, async (_instance, state) => {
			const stored = await state.storage.get<GameState>("state");
			expect(stored?.players).toHaveLength(4);
		});
	});

	it("initializes a room only once under concurrent creation", async () => {
		const room = roomStub("concurrent-create");
		const results = await Promise.all(
			Array.from({ length: 4 }, (_, index) => room.initRoom(`Host ${index}`)),
		);
		expect(results.filter((result) => result.created)).toHaveLength(1);

		await runInDurableObject(room, async (_instance, state) => {
			const stored = await state.storage.get<GameState>("state");
			expect(stored?.players).toHaveLength(1);
			expect(stored?.players[0].role).toBe("host");
		});
	});

	it("deletes the room when the host disconnect timeout alarm expires", async () => {
		const room = roomStub("host-timeout");
		await room.initRoom("Host");

		await runInDurableObject(room, async (_instance, state) => {
			const stored = await state.storage.get<GameState>("state");
			expect(stored).toBeDefined();
			if (!stored) return;
			stored.hostDisconnectedAt = Date.now() - 5 * 60 * 1000 - 1;
			await state.storage.put("state", stored);
			await state.storage.setAlarm(Date.now() + 60_000);
		});

		expect(await runDurableObjectAlarm(room)).toBe(true);
		expect(await room.roomExists()).toBe(false);
	});
});
