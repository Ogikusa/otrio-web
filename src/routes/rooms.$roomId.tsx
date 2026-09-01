import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/rooms/$roomId")({
	component: RouteComponent,
});

function RouteComponent() {
	const { roomId } = Route.useParams();
	const [token, setToken] = useState<string | null>(null);
	useEffect(() => {
		const t = sessionStorage.getItem(`room:${roomId}:token`);
		setToken(t);
	}, [roomId]);
	return (
		<div>
			Hello {roomId} <br /> {token === "" ? "トークンが存在しません" : token}
		</div>
	);
}
