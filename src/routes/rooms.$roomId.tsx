import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import type { PlayerColor } from "../../worker/lib/board";
import { type BoardHole, GameBoard } from "../components/GameBoard";
import { PieceInventory } from "../components/PieceInventory";
import { useGameRoom } from "../hooks/useGameRoom";
import { joinRoom, roomExists } from "../lib/room";

export const Route = createFileRoute("/rooms/$roomId")({
	component: RouteComponent,
});

function RouteComponent() {
	const { roomId } = Route.useParams();
	const [hasToken, setHasToken] = useState(() =>
		typeof window === "undefined"
			? false
			: Boolean(sessionStorage.getItem(`room:${roomId}:token`)),
	);

	return hasToken ? (
		<GameRoom roomId={roomId} />
	) : (
		<RoomJoin roomId={roomId} onJoined={() => setHasToken(true)} />
	);
}

function RoomJoin({
	roomId,
	onJoined,
}: {
	roomId: string;
	onJoined: () => void;
}) {
	const navigate = useNavigate({ from: "/rooms/$roomId" });
	const [name, setName] = useState("");
	const [isPending, setIsPending] = useState(false);
	const [isChecking, setIsChecking] = useState(true);
	const [roomFound, setRoomFound] = useState(false);
	const [error, setError] = useState<string>();

	useEffect(() => {
		let active = true;
		roomExists(roomId)
			.then((exists) => {
				if (!active) return;
				setRoomFound(exists);
				if (!exists) setError("ルームが見つかりません");
			})
			.catch((cause) => {
				if (!active) return;
				setRoomFound(false);
				setError(cause instanceof Error ? cause.message : "通信に失敗しました");
			})
			.finally(() => {
				if (active) setIsChecking(false);
			});
		return () => {
			active = false;
		};
	}, [roomId]);

	return (
		<main className="flex min-h-screen items-center justify-center px-4">
			<div className="w-full max-w-md border border-black p-6">
				<p className="text-xs font-bold uppercase">Room</p>
				<h1 className="font-mono text-3xl font-black">{roomId}</h1>
				{isChecking ? (
					<p className="mt-6 font-bold">ルームを確認しています…</p>
				) : !roomFound ? (
					<>
						<p className="mt-6 font-bold text-red-700" role="alert">
							{error}
						</p>
						<button
							type="button"
							className="mt-4 w-full border border-black p-3 font-bold hover:bg-black hover:text-white"
							onClick={() => navigate({ to: "/" })}
						>
							ホームへ戻る
						</button>
					</>
				) : (
					<form
						className="mt-6 space-y-4"
						onSubmit={async (event) => {
							event.preventDefault();
							const normalizedName = name.trim();
							if (!normalizedName) {
								setError("名前を入力してください");
								return;
							}
							setIsPending(true);
							try {
								const credentials = await joinRoom(roomId, normalizedName);
								sessionStorage.setItem(
									`room:${roomId}:token`,
									credentials.token,
								);
								onJoined();
							} catch (cause) {
								setError(
									cause instanceof Error ? cause.message : "通信に失敗しました",
								);
								setIsPending(false);
							}
						}}
					>
						<label className="block font-bold" htmlFor="player-name">
							参加名
						</label>
						<input
							id="player-name"
							className="h-14 w-full border border-black p-2 text-xl"
							value={name}
							maxLength={24}
							disabled={isPending}
							onChange={(event) => setName(event.target.value)}
						/>
						{error ? (
							<p className="font-bold text-red-700" role="alert">
								{error}
							</p>
						) : null}
						<button
							type="submit"
							className="w-full border border-black p-4 font-bold hover:bg-black hover:text-white disabled:bg-stone-100 disabled:text-stone-400"
							disabled={isPending}
						>
							{isPending ? "参加中…" : "ルームに参加"}
						</button>
					</form>
				)}
			</div>
		</main>
	);
}

function GameRoom({ roomId }: { roomId: string }) {
	const navigate = useNavigate({ from: "/rooms/$roomId" });
	const [selectedHole, setSelectedHole] = useState<BoardHole>();
	const [selectedPieceColor, setSelectedPieceColor] = useState<PlayerColor>(0);
	const [otrioReserved, setOtrioReserved] = useState(false);
	const [isLeaving, setIsLeaving] = useState(false);
	const {
		state,
		playerId,
		connectionStatus,
		error,
		notice,
		removedReason,
		send,
		clearNotice,
	} = useGameRoom(roomId);
	const connectionLabel = {
		connecting: "接続中",
		authenticating: "認証中",
		connected: "接続済み",
		reconnecting: "再接続中",
		disconnected: "切断済み",
		error: "接続エラー",
	}[connectionStatus];
	const isHost = state?.players.some(
		(player) => player.id === playerId && player.role === "host",
	);
	const isMyTurn = state?.currentPlayer === playerId;
	const currentPlayer = state?.players.find(
		(player) => player.id === state.currentPlayer,
	);
	const winner = state?.players.find((player) => player.id === state.winnerId);
	const me = state?.players.find((player) => player.id === playerId);
	const playerColors = {
		0: "bg-red-500",
		1: "bg-blue-500",
		2: "bg-emerald-500",
		3: "bg-purple-500",
	} as const;
	const playerColorNames = {
		0: "赤",
		1: "青",
		2: "緑",
		3: "紫",
	} as const;
	const claimLocked = playerId
		? state?.otrioClaimLockedPlayerIds.includes(playerId) === true
		: false;
	const orderedPlayers = state
		? [
				...state.gamePlayerIds
					.map((id) => state.players.find((player) => player.id === id))
					.filter((player) => player !== undefined),
				...state.players.filter(
					(player) => !state.gamePlayerIds.includes(player.id),
				),
			]
		: [];

	useEffect(() => {
		if (me?.colors.length && !me.colors.includes(selectedPieceColor)) {
			setSelectedPieceColor(me.colors[0]);
		}
	}, [me, selectedPieceColor]);

	useEffect(() => {
		if (!isMyTurn || state?.status !== "playing") {
			setOtrioReserved(false);
			setSelectedHole(undefined);
		}
	}, [isMyTurn, state?.status]);

	useEffect(() => {
		if (!removedReason) return;
		sessionStorage.removeItem(`room:${roomId}:token`);
		if (!isLeaving) window.alert(removedReason);
		navigate({ to: "/" });
	}, [isLeaving, navigate, removedReason, roomId]);
	const boardMessage = (() => {
		if (connectionStatus !== "connected") return "サーバーに接続しています";
		if (state?.status === "finished") {
			return winner ? `${winner.name} が勝利しました` : "ゲームが終了しました";
		}
		if (state?.status !== "playing") return "ゲーム開始を待っています";
		if (!isMyTurn) return `${currentPlayer?.name ?? "相手"} のターンです`;
		if (selectedHole) {
			return `${selectedHole.position + 1}番の${["小", "中", "大"][selectedHole.size]}サイズを選択中`;
		}
		return "あなたのターンです。置く穴を選択してください";
	})();

	return (
		<main className="min-h-screen px-4 py-5 text-black sm:px-8 sm:py-8">
			<header className="mx-auto mb-6 flex w-full max-w-360 items-center justify-between gap-4">
				<div>
					<p className="text-xs font-bold uppercase">Room</p>
					<h1 className="font-mono text-2xl font-black sm:text-3xl">
						{roomId}
					</h1>
				</div>
				<div className="flex items-center gap-3">
					<span
						className={`border px-4 py-2 text-sm font-bold ${
							connectionStatus === "connected"
								? "border-emerald-600 text-emerald-700"
								: connectionStatus === "error"
									? "border-red-600 text-red-700"
									: "border-amber-500 text-amber-700"
						}`}
						aria-live="polite"
					>
						{connectionLabel}
					</span>
					<button
						type="button"
						className="border border-black bg-white px-4 py-2 text-sm font-bold transition-colors hover:bg-black hover:text-white"
						disabled={connectionStatus !== "connected" || isLeaving}
						onClick={() => {
							if (!window.confirm("このRoomから退出しますか？")) return;
							setIsLeaving(true);
							if (!send({ type: "leave" })) setIsLeaving(false);
						}}
					>
						{isLeaving ? "退出中" : "退出"}
					</button>
				</div>
			</header>

			<section className="mx-auto grid w-full max-w-360 items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)_18rem]">
				<div className="order-1 flex flex-col items-center justify-center gap-4 p-3 sm:p-8 lg:order-2 lg:p-4">
					<div className="relative w-full max-w-160">
						<GameBoard
							board={state?.board}
							selectedHole={selectedHole}
							selectedColor={selectedPieceColor}
							disabled={
								connectionStatus !== "connected" ||
								state?.status !== "playing" ||
								!isMyTurn
							}
							onHoleClick={setSelectedHole}
						/>
						{state?.status === "finished" && winner ? (
							<div className="absolute inset-0 z-10 flex flex-col items-center justify-center border-4 border-black bg-white/90 p-6 text-center backdrop-blur-sm">
								<p className="text-sm font-black tracking-[0.3em] uppercase">
									Winner
								</p>
								<div className="mt-5 flex gap-2">
									{winner.colors.map((color) => (
										<span
											key={color}
											className={`size-8 rounded-full border-2 border-black sm:size-12 ${playerColors[color]}`}
										/>
									))}
								</div>
								<p className="mt-5 text-4xl font-black sm:text-6xl">
									{winner.name}
								</p>
								<p className="mt-3 text-xl font-black sm:text-3xl">
									オートリオ！
								</p>
							</div>
						) : null}
					</div>
					<p className="min-h-6 text-sm font-bold" aria-live="polite">
						{boardMessage}
					</p>
				</div>

				<aside className="contents">
					<div className="order-3 border border-black p-5 lg:order-1 lg:sticky lg:top-8 lg:max-h-[80vh] lg:overflow-y-auto">
						<PieceInventory
							board={state?.board}
							players={orderedPlayers}
							playerId={playerId}
						/>
						<div className="my-5 border-t border-stone-300" />
						<p className="text-xs font-bold tracking-[0.2em] uppercase">
							Players
						</p>
						<h2 className="mt-1 text-xl font-black">プレイヤー</h2>
						{orderedPlayers.length ? (
							<ul className="mt-5 space-y-2">
								{orderedPlayers.map((player, index) => (
									<li
										key={player.id}
										className="flex items-center justify-between border border-stone-300 px-3 py-2 text-sm"
									>
										<span className="font-bold">
											{player.isPlaying ? `${index + 1}. ` : ""}
											<span className="mr-2 inline-flex gap-1">
												{player.colors.map((color) => (
													<span
														key={color}
														className={`inline-block size-3 rounded-full ${playerColors[color]}`}
													/>
												))}
											</span>
											{player.name}
											{player.id === playerId ? "（あなた）" : ""}
											{state?.status !== "waiting" && !player.isPlaying
												? "（次戦待機）"
												: ""}
										</span>
										<span className="flex items-center gap-2">
											{player.role === "host" ? (
												<span className="text-xs text-stone-500">HOST</span>
											) : null}
											{isHost && player.id !== playerId ? (
												<button
													type="button"
													className="border border-red-300 px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-600 hover:text-white"
													onClick={() => {
														if (
															window.confirm(
																`${player.name} をキックしますか？`,
															)
														) {
															send({ type: "kick", playerId: player.id });
														}
													}}
												>
													キック
												</button>
											) : null}
										</span>
									</li>
								))}
							</ul>
						) : (
							<div className="mt-5 border border-dashed border-stone-300 p-5 text-center text-sm text-stone-500">
								参加者を読み込んでいます
							</div>
						)}
					</div>
					<div className="order-2 flex min-h-64 flex-col justify-center gap-5 border p-5 lg:order-3 lg:sticky lg:top-8 lg:justify-start">
						<div className="bg-stone-100 p-4">
							<p className="text-xs font-bold text-stone-500">ゲーム状況</p>
							<p className="mt-1 font-bold">
								{state?.status === "playing"
									? `${currentPlayer?.name ?? "-"} のターン${isMyTurn ? "（あなた）" : ""}`
									: state?.status === "finished"
										? `${winner?.name ?? "-"} の勝利`
										: "待機中"}
							</p>
						</div>
						{error ? (
							<p className="text-sm font-bold text-red-700" role="alert">
								{error}
							</p>
						) : null}
						{(me?.colors.length ?? 0) > 1 ? (
							<fieldset className="flex gap-2" aria-label="配置する駒の色">
								{me?.colors.map((color) => (
									<button
										key={color}
										type="button"
										className={`flex-1 border p-2 text-sm font-bold transition-colors ${
											selectedPieceColor === color
												? `${playerColors[color]} border-black text-white`
												: "border-stone-300 bg-white"
										}`}
										disabled={!isMyTurn || state?.status !== "playing"}
										onClick={() => setSelectedPieceColor(color)}
									>
										{playerColorNames[color]}
									</button>
								))}
							</fieldset>
						) : null}
						<button
							type="button"
							className="p-4 border w-full font-bold text-center transition-colors hover:bg-black hover:text-white disabled:bg-stone-100 disabled:text-stone-400"
							disabled={
								!selectedHole ||
								!isMyTurn ||
								state?.status !== "playing" ||
								connectionStatus !== "connected"
							}
							onClick={() => {
								if (!selectedHole) return;
								send({
									type: "move",
									position: selectedHole.position,
									size: selectedHole.size,
									color: selectedPieceColor,
									declareOtrio: otrioReserved,
								});
							}}
						>
							コマを配置
						</button>
						<button
							type="button"
							className={`flex w-full items-center justify-center gap-2 border p-4 font-bold text-center transition-colors hover:bg-black hover:text-white disabled:bg-stone-100 disabled:text-stone-400 ${
								otrioReserved ? "bg-black text-white" : ""
							}`}
							disabled={
								state?.status !== "playing" ||
								connectionStatus !== "connected" ||
								!me?.isPlaying ||
								(!isMyTurn && claimLocked)
							}
							onClick={() => {
								if (isMyTurn) {
									setOtrioReserved((reserved) => !reserved);
								} else {
									send({ type: "claimOtrio" });
								}
							}}
						>
							{otrioReserved ? <Check aria-hidden="true" size={18} /> : null}
							{isMyTurn ? (
								<span>
									設置と一緒に
									<br />
									「オートリオ！」と言う
								</span>
							) : (
								"「オートリオ！」と言う"
							)}
						</button>
						{notice ? (
							<div
								className="mx-auto mb-5 flex flex-col w-full max-w-360 items-start justify-between gap-4 border-2 border-amber-500 bg-amber-50 p-4 text-amber-950"
								aria-live="polite"
							>
								<p className="font-bold">{notice}</p>
								<button
									type="button"
									className="shrink-0 border border-amber-700 w-full px-2 py-1 text-xs font-bold hover:bg-amber-700 hover:text-white"
									onClick={clearNotice}
								>
									閉じる
								</button>
							</div>
						) : null}
						<div className="border-t border-stone-300 pt-5">
							<button
								type="button"
								className="w-full border p-4 font-bold text-center transition-colors hover:bg-black hover:text-white disabled:bg-stone-100 disabled:text-stone-400"
								disabled={
									!isHost ||
									connectionStatus !== "connected" ||
									state?.status !== "waiting" ||
									(state?.players.length ?? 0) < 2
								}
								onClick={() => send({ type: "start" })}
							>
								ゲームを開始
							</button>
							<label className="mt-3 flex items-center gap-2 text-sm font-bold">
								<input
									type="checkbox"
									className="size-4 accent-black"
									checked={state?.randomizeTurnOrder ?? false}
									disabled={
										!isHost ||
										connectionStatus !== "connected" ||
										state?.status !== "waiting"
									}
									onChange={(event) =>
										send({
											type: "setRandomizeTurnOrder",
											enabled: event.target.checked,
										})
									}
								/>
								開始時に順番をランダムにする
							</label>
							{state?.status !== "waiting" ? (
								<button
									type="button"
									className="mt-3 w-full border border-red-600 p-3 text-sm font-bold text-red-700 transition-colors hover:bg-red-600 hover:text-white disabled:border-stone-300 disabled:bg-stone-100 disabled:text-stone-400"
									disabled={!isHost || connectionStatus !== "connected"}
									onClick={() => {
										if (window.confirm("現在の盤面をリセットしますか？")) {
											send({ type: "reset" });
										}
									}}
								>
									試合をリセット
								</button>
							) : null}
						</div>
					</div>
				</aside>
			</section>
		</main>
	);
}
