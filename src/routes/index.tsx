import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const [isPending, setIsPending] = useState(false);

	return (
		<>
			<main className="flex w-full min-h-screen flex-col justify-center items-center gap-4">
				<h1 className="text-6xl mb-8">Otrio Web</h1>
				<p>名前を入力…</p>
				<input
					className="border h-16 w-90 p-2 text-2xl font-bold text-center disabled:bg-gray-200"
					disabled={isPending}
				/>
				<div className="flex flex-col gap-2 w-90 items-center border p-4">
					<p>ルームIDを入力…</p>
					<div className="flex gap-2 w-80">
						<input
							className="border h-16 min-w-0 flex-1 p-2 text-2xl font-bold text-center disabled:bg-gray-200"
							disabled={isPending}
						/>
						<button
							type="button"
							className="border border-black w-16 h-16 transition-colors cursor-pointer
							hover:bg-black hover:text-white
							disabled:bg-gray-200 disabled:text-black disabled:cursor-progress
						"
							disabled={isPending}
							onClick={async () => {
								setIsPending(true);
								await new Promise((resolve) => setTimeout(resolve, 2000));
								setIsPending(false);
							}}
						>
							参加
						</button>
					</div>
					<p>もしくは</p>
					<button
						type="button"
						className="border h-16 w-80 hover:bg-black hover:text-white transition-colors"
					>
						ルームの作成
					</button>
				</div>
			</main>
			<div className="fixed right-2 bottom-2 text-right">
				<p>Created by Ogikusa</p>
			</div>
		</>
	);
}
