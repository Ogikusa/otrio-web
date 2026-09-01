export async function createRoom() {
	const response = await fetch("/api/rooms", {
		method: "POST",
	});

	if (!response.ok) {
		throw new Error("Failed to create room");
	}
}
