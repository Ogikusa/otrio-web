import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { type BoardHole, GameBoard } from "../components/GameBoard";

export const Route = createFileRoute("/rooms/$roomId")({
	component: RouteComponent,
});

function RouteComponent() {
	const { roomId } = Route.useParams();
	const [selectedHole, setSelectedHole] = useState<BoardHole>();

	return (
		<main className="min-h-screen px-4 py-5 text-black sm:px-8 sm:py-8">
			<header className="mx-auto mb-6 flex w-full max-w-6xl items-center justify-between gap-4">
				<div>
					<p className="text-xs font-bold uppercase">Room</p>
					<h1 className="font-mono text-2xl font-black sm:text-3xl">
						{roomId}
					</h1>
				</div>
				<div className="flex items-center gap-3">
					<Link
						to="/"
						className="border border-black bg-white px-4 py-2 text-sm font-bold transition-colors hover:bg-black hover:text-white"
					>
						退出
					</Link>
				</div>
			</header>

			<section className="mx-auto grid w-full max-w-6xl items-center gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
				<div className="flex flex-col items-center justify-center gap-4 p-3 sm:p-8">
					<GameBoard
						selectedHole={selectedHole}
						onHoleClick={setSelectedHole}
					/>
					<p className="min-h-6 text-sm font-bold" aria-live="polite">
						{selectedHole
							? `${selectedHole.position + 1}番の${["小", "中", "大"][selectedHole.size]}サイズを選択中`
							: "置く穴を選択してください"}
					</p>
				</div>

				<aside className="border border-black p-5 lg:self-stretch">
					<p className="text-xs font-bold tracking-[0.2em] uppercase">
						Players
					</p>
					<h2 className="mt-1 text-xl font-black">プレイヤー</h2>
					<div className="mt-5 border border-dashed border-stone-300 p-5 text-center text-sm text-stone-500">
						参加者を待っています
					</div>
					<div className="mt-5 bg-stone-100 p-4">
						<p className="text-xs font-bold text-stone-500">ゲーム状況</p>
						<p className="mt-1 font-bold">待機中</p>
					</div>
					<button
						type="button"
						className="mt-5 p-4 border w-full font-bold text-center transition-colors hover:bg-black hover:text-white disabled:bg-stone-100 disabled:text-stone-400"
						disabled={true}
					>
						ゲームを開始
					</button>
				</aside>
			</section>
		</main>
	);
}
