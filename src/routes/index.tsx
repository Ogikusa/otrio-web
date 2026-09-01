import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const [isPending, setIsPending] = useState(false);
	const [isJoinable, setIsJoinable] = useState(false);

	return (
		<>
			<main className="flex w-full min-h-screen flex-col justify-center items-center gap-4">
				<h1 className="text-6xl">Otrio Web</h1>
				<p>ルームIDを入力…</p>
				<div className="flex gap-2 w-90">
					<input
						className="border h-16 min-w-0 flex-1 p-2 text-2xl font-bold text-center disabled:bg-gray-200"
						disabled={isPending || isJoinable}
					/>
					{isJoinable ? (
						<div className="flex justify-center items-center border border-black w-16 h-16 bg-green-400 text-white">
							<Check className="size-8" />
						</div>
					) : (
						<button
							type="button"
							className="border border-black w-16 h-16 transition-colors
						hover:bg-black hover:text-white
						"
							disabled={isPending}
							onClick={async () => {
								setIsPending(true);
								await new Promise((resolve) => setTimeout(resolve, 2000));
								setIsJoinable(true);
								setIsPending(false);
							}}
						>
							接続
						</button>
					)}
				</div>
				<div className="relative flex flex-col items-center gap-4">
					<p>もしくは</p>
					<button
						type="button"
						className="border h-16 w-90 hover:bg-black hover:text-white transition-colors"
					>
						ルームの作成
					</button>
					<div
						className={`${isJoinable ? "opacity-100" : "opacity-0 pointer-events-none"}
							flex flex-col gap-4
							transition-opacity ease-linear
							absolute top-0 left-0 w-90 h-full bg-white text-center`}
					>
						名前を入力…
						<div className="flex gap-2">
							<input className="border h-16 min-w-0 flex-1 p-2 text-2xl font-bold text-center" />
							<button
								type="button"
								className="border border-black w-16 h-16 transition-colors
							hover:bg-black hover:text-white"
							>
								参加
							</button>
						</div>
					</div>
				</div>
			</main>
			<div className="fixed right-2 bottom-2 text-right">
				<p>Created by Ogikusa</p>
			</div>
		</>
	);
}
