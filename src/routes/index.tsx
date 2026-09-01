import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { roomExists } from "../lib/room";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const navigate = useNavigate({ from: "/" });
	const [isPending, setIsPending] = useState(false);
	const [roomId, setRoomId] = useState("");
	const [errorMsg, setErrorMsg] = useState("");

	return (
		<>
			<main className="flex w-full min-h-screen flex-col justify-center items-center gap-4">
				<h1 className="text-6xl mb-8">Otrio Web</h1>
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
								const normalizedRoomId = roomId.trim().toUpperCase();
								if (
									!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(
										normalizedRoomId,
									)
								) {
									setErrorMsg("6文字のルームIDを入力してください");
									return;
								}
								setIsPending(true);
								setErrorMsg("");
								try {
									if (!(await roomExists(normalizedRoomId))) {
										setErrorMsg("ルームが見つかりません");
										setIsPending(false);
										return;
									}
									await navigate({
										to: "/rooms/$roomId",
										params: { roomId: normalizedRoomId },
									});
								} catch (error) {
									setErrorMsg(
										error instanceof Error
											? error.message
											: "通信に失敗しました",
									);
									setIsPending(false);
								}
							}}
						>
							移動
						</button>
					</div>
					<p>もしくは</p>
					<Link
						to="/create"
						className="border h-16 w-80 hover:bg-black hover:text-white transition-colors cursor-pointer
						flex items-center justify-center"
					>
						新しいルームを作成
					</Link>
				</div>
				<p className="text-red-600 h-6">{errorMsg}</p>
			</main>
			<div className="fixed right-2 bottom-2 text-right">
				<p>Created by Ogikusa</p>
			</div>
		</>
	);
}
