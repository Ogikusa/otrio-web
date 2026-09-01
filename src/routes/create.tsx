import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createRoom } from "../lib/room";

export const Route = createFileRoute("/create")({
	component: CreateRoom,
});

function CreateRoom() {
	const navigate = useNavigate({ from: "/create" });
	const [name, setName] = useState("");
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string>();

	return (
		<main className="flex min-h-screen items-center justify-center px-4">
			<div className="w-full max-w-md border border-black p-6">
				<p className="text-xs font-bold uppercase">Create Room</p>
				<h1 className="mt-1 text-3xl font-black">新しいルームを作成</h1>
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
						setError(undefined);
						try {
							const room = await createRoom(normalizedName);
							sessionStorage.setItem(`room:${room.roomId}:token`, room.token);
							await navigate({
								to: "/rooms/$roomId",
								params: { roomId: room.roomId },
							});
						} catch (cause) {
							setError(
								cause instanceof Error ? cause.message : "通信に失敗しました",
							);
							setIsPending(false);
						}
					}}
				>
					<label className="block font-bold" htmlFor="host-name">
						あなたの名前
					</label>
					<input
						id="host-name"
						className="h-14 w-full border border-black p-2 text-xl disabled:bg-stone-100"
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
						className="w-full border border-black p-4 font-bold transition-colors cursor-pointer disabled:cursor-not-allowed hover:bg-black hover:text-white disabled:bg-stone-100 disabled:text-stone-400"
						disabled={isPending}
					>
						{isPending ? "作成中…" : "ルームを作成"}
					</button>
				</form>
				<Link
					to="/"
					className="mt-4 block text-center text-sm font-bold underline"
				>
					ホームへ戻る
				</Link>
			</div>
		</main>
	);
}
