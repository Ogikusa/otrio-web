import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<>
			<main className="flex w-full min-h-screen flex-col justify-center items-center gap-4">
				<h1 className="text-6xl">Otrio Web</h1>
				<p>ルームIDを入力…</p>
				<div className="flex gap-2 w-90">
					<input className="border h-16 min-w-0 flex-1 p-2 text-2xl font-bold text-center" />
					<button
						type="button"
						className="border w-16 h-16 hover:bg-black hover:text-white transition-colors"
					>
						参加
					</button>
				</div>
				<p>もしくは</p>
				<button
					type="button"
					className="border h-16 w-90 hover:bg-black hover:text-white transition-colors"
				>
					ルームの作成
				</button>
			</main>
			<div className="fixed right-2 bottom-2 text-right">
				<p>Created by Ogikusa</p>
			</div>
		</>
	);
}
