import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createRoom, joinRoom } from "../lib/room";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const navigate = useNavigate({ from: "/" });
	const [isPending, setIsPending] = useState(false);
	const [name, setName] = useState("");
	const [roomId, setRoomId] = useState("");
	const [errorMsg, setErrorMsg] = useState("");

	const validateName = () => {
		const normalizedName = name.trim();
		if (normalizedName.length === 0) {
			setErrorMsg("名前を入力してください");
			return;
		}
		if (normalizedName.length > 24) {
			setErrorMsg("名前は24文字以内で入力してください");
			return;
		}
		return normalizedName;
	};

	const enterRoom = async (
		targetRoomId: string,
		request: () => Promise<{ token: string }>,
	) => {
		setIsPending(true);
		setErrorMsg("");
		try {
			const { token } = await request();
			sessionStorage.setItem(`room:${targetRoomId}:token`, token);
			await navigate({
				to: "/rooms/$roomId",
				params: { roomId: targetRoomId },
			});
		} catch (error) {
			setErrorMsg(
				error instanceof Error ? error.message : "通信に失敗しました",
			);
			setIsPending(false);
		}
	};

	return (
		<>
			<main className="flex w-full min-h-screen flex-col justify-center items-center gap-4">
				<h1 className="text-6xl mb-8">Otrio Web</h1>
				<p>名前を入力…</p>
				<input
					className="border h-16 w-90 p-2 text-2xl font-bold text-center disabled:bg-gray-200"
					disabled={isPending}
					value={name}
					maxLength={24}
					onChange={(e) => {
						setName(e.target.value);
					}}
				/>
				<div className="flex flex-col gap-2 w-90 items-center border p-4">
					<p>ルームIDを入力…</p>
					<div className="flex gap-2 w-80">
						<input
							className="border h-16 min-w-0 flex-1 p-2 text-2xl font-bold text-center disabled:bg-gray-200"
							disabled={isPending}
							value={roomId}
							maxLength={6}
							onChange={(e) => {
								setRoomId(e.target.value.toUpperCase());
							}}
						/>
						<button
							type="button"
							className="border border-black w-16 h-16 transition-colors cursor-pointer
							hover:bg-black hover:text-white
							disabled:bg-gray-200 disabled:text-black disabled:cursor-progress
						"
							disabled={isPending}
							onClick={async () => {
								const normalizedName = validateName();
								const normalizedRoomId = roomId.trim().toUpperCase();
								if (!normalizedName) return;
								if (
									!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(
										normalizedRoomId,
									)
								) {
									setErrorMsg("6文字のルームIDを入力してください");
									return;
								}
								await enterRoom(normalizedRoomId, () =>
									joinRoom(normalizedRoomId, normalizedName),
								);
							}}
						>
							参加
						</button>
					</div>
					<p>もしくは</p>
					<button
						type="button"
						className="border h-16 w-80 hover:bg-black hover:text-white transition-colors cursor-pointer
						disabled:bg-gray-200 disabled:text-black disabled:cursor-progress"
						disabled={isPending}
						onClick={async () => {
							const normalizedName = validateName();
							if (!normalizedName) return;
							setIsPending(true);
							setErrorMsg("");
							try {
								const room = await createRoom(normalizedName);
								sessionStorage.setItem(`room:${room.roomId}:token`, room.token);
								await navigate({
									to: "/rooms/$roomId",
									params: { roomId: room.roomId },
								});
							} catch (error) {
								setErrorMsg(
									error instanceof Error ? error.message : "通信に失敗しました",
								);
								setIsPending(false);
							}
						}}
					>
						ルームの作成
					</button>
				</div>
				<p className="text-red-600 h-6">{errorMsg}</p>
			</main>
			<div className="fixed right-2 bottom-2 text-right">
				<p>Created by Ogikusa</p>
			</div>
		</>
	);
}
