import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicGameState } from "../../worker/lib/game";

export type ConnectionStatus =
	| "connecting"
	| "authenticating"
	| "connected"
	| "reconnecting"
	| "disconnected"
	| "error";

interface ServerMessage {
	type: string;
	playerId?: string;
	state?: PublicGameState;
	message?: string;
	reason?: string;
}

export function useGameRoom(roomId: string) {
	const [state, setState] = useState<PublicGameState>();
	const [playerId, setPlayerId] = useState<string>();
	const [connectionStatus, setConnectionStatus] =
		useState<ConnectionStatus>("connecting");
	const [error, setError] = useState<string>();
	const [notice, setNotice] = useState<string>();
	const [removedReason, setRemovedReason] = useState<string>();
	const socketRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		const token = sessionStorage.getItem(`room:${roomId}:token`);
		if (!token) {
			setConnectionStatus("error");
			setError("参加tokenがありません。ホームから参加してください。");
			return;
		}

		let active = true;
		let retryTimer: ReturnType<typeof setTimeout> | undefined;
		let retryCount = 0;

		const connect = () => {
			setConnectionStatus(retryCount === 0 ? "connecting" : "reconnecting");
			const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
			const socket = new WebSocket(
				`${protocol}//${window.location.host}/api/rooms/${encodeURIComponent(roomId)}/ws`,
			);
			socketRef.current = socket;

			socket.addEventListener("open", () => {
				retryCount = 0;
				setConnectionStatus("authenticating");
				socket.send(JSON.stringify({ type: "auth", token }));
			});

			socket.addEventListener("message", (event) => {
				if (typeof event.data !== "string") return;
				try {
					const message = JSON.parse(event.data) as ServerMessage;
					if (message.type === "authenticated" && message.playerId) {
						setPlayerId(message.playerId);
						setConnectionStatus("connected");
						setError(undefined);
					} else if (message.type === "state" && message.state) {
						setState(message.state);
						setError(undefined);
					} else if (message.type === "error" && message.message) {
						setError(message.message);
					} else if (message.type === "notice" && message.message) {
						setNotice(message.message);
					} else if (message.type === "removed") {
						setRemovedReason(message.reason ?? "Roomから退出しました");
						setConnectionStatus("disconnected");
					}
				} catch {
					setError("サーバーから不正なメッセージを受信しました");
				}
			});

			socket.addEventListener("close", (event) => {
				if (socketRef.current === socket) socketRef.current = null;
				if (!active) return;
				if (event.code === 4003) {
					setConnectionStatus("disconnected");
					return;
				}
				if (event.code === 4004) {
					setRemovedReason("ルームが見つからないか、すでに終了しました");
					setConnectionStatus("disconnected");
					return;
				}
				if (event.code === 4001) {
					setConnectionStatus("error");
					setError("認証に失敗しました。ホームから参加し直してください。");
					return;
				}
				retryCount += 1;
				setConnectionStatus("reconnecting");
				retryTimer = setTimeout(
					connect,
					Math.min(1000 * 2 ** retryCount, 10_000),
				);
			});

			socket.addEventListener("error", () => {
				setError("WebSocket接続でエラーが発生しました");
			});
		};

		connect();
		return () => {
			active = false;
			if (retryTimer) clearTimeout(retryTimer);
			socketRef.current?.close(1000, "Page closed");
			socketRef.current = null;
			setConnectionStatus("disconnected");
		};
	}, [roomId]);

	const send = useCallback((message: unknown) => {
		const socket = socketRef.current;
		if (socket?.readyState !== WebSocket.OPEN) return false;
		socket.send(JSON.stringify(message));
		return true;
	}, []);
	const clearNotice = useCallback(() => setNotice(undefined), []);

	return {
		state,
		playerId,
		connectionStatus,
		error,
		notice,
		removedReason,
		send,
		clearNotice,
	};
}
