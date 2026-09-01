import type { BoardData, PieceSize, PlayerColor } from "../../worker/lib/board";
import type { PublicPlayer } from "../../worker/lib/game";

interface PieceInventoryProps {
	board?: BoardData;
	players: PublicPlayer[];
	playerId?: string;
}

const PIECE_SHAPES = [
	{ size: 2, radius: 40, width: 8, filled: false },
	{ size: 1, radius: 24, width: 8, filled: false },
	{ size: 0, radius: 9, width: 0, filled: true },
] as const;
const PIECE_STACKS = [0, 1, 2] as const;
const COLOR_STYLES: Record<PlayerColor, string> = {
	0: "text-red-500",
	1: "text-blue-500",
	2: "text-emerald-500",
	3: "text-purple-500",
};
const COLOR_BACKGROUND_STYLES: Record<PlayerColor, string> = {
	0: "bg-red-500",
	1: "bg-blue-500",
	2: "bg-emerald-500",
	3: "bg-purple-500",
};
const COLOR_NAMES: Record<PlayerColor, string> = {
	0: "赤",
	1: "青",
	2: "緑",
	3: "紫",
};

function countUsedPieces(
	board: BoardData | undefined,
	color: PlayerColor,
	size: PieceSize,
) {
	if (!board) return 0;
	return board.reduce(
		(total, cell) => total + (cell[size] === color ? 1 : 0),
		0,
	);
}

function getRemainingPieces(board: BoardData | undefined, color: PlayerColor) {
	return [0, 1, 2].map(
		(size) => 3 - countUsedPieces(board, color, size as PieceSize),
	);
}

export function PieceInventory({
	board,
	players,
	playerId,
}: PieceInventoryProps) {
	if (players.length === 0)
		return <p className="text-center text-sm text-stone-500">読み込み中</p>;

	return (
		<section aria-labelledby="piece-inventory-title">
			<h2 id="piece-inventory-title" className="text-sm font-black">
				手持ちのコマ
			</h2>
			<div className="mt-3 space-y-3">
				{players.map((player) => {
					const isMe = player.id === playerId;
					return (
						<div
							key={player.id}
							className={`p-3 ${isMe ? "border-2 border-black bg-amber-50" : "border border-stone-300 bg-white"}`}
						>
							<div className="flex items-center justify-between gap-2">
								<p className="truncate text-sm font-black">{player.name}</p>
								{isMe ? (
									<span className="shrink-0 bg-black px-2 py-1 text-[10px] font-bold text-white">
										あなた
									</span>
								) : null}
							</div>
							{player.colors.length === 0 ? (
								<p className="mt-2 text-xs text-stone-500">次戦待機中</p>
							) : (
								<div className="mt-3 space-y-3">
									{player.colors.map((color) => {
										const remainingPieces = getRemainingPieces(board, color);
										return (
											<div key={color}>
												<p className="flex items-center gap-2 text-xs font-bold">
													<span
														className={`inline-block size-3 rounded-full ${COLOR_BACKGROUND_STYLES[color]}`}
													/>
													{COLOR_NAMES[color]}
												</p>
												<div className="mt-2 grid grid-cols-3 gap-2">
													{PIECE_STACKS.map((stackIndex) => (
														<svg
															key={stackIndex}
															viewBox="0 0 100 100"
															className={`aspect-square w-full bg-stone-50 p-1 ${COLOR_STYLES[color]}`}
															role="img"
															aria-label={`${COLOR_NAMES[color]}の駒セット ${stackIndex + 1}`}
														>
															{PIECE_SHAPES.map(
																({ size, radius, width, filled }) => {
																	const available =
																		remainingPieces[size] > stackIndex;
																	return (
																		<circle
																			key={size}
																			cx="50"
																			cy="50"
																			r={radius}
																			fill={
																				available && filled
																					? "currentColor"
																					: "none"
																			}
																			stroke={
																				available && filled
																					? "none"
																					: "currentColor"
																			}
																			strokeWidth={available ? width : 2}
																			strokeDasharray={
																				available ? undefined : "3 5"
																			}
																			className={
																				available ? "" : "text-stone-300"
																			}
																		/>
																	);
																},
															)}
														</svg>
													))}
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</section>
	);
}
