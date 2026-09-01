import type { BoardData, PlayerColor } from "../../worker/lib/board";

export type BoardHoleSize = 0 | 1 | 2;

export interface BoardHole {
	position: number;
	size: BoardHoleSize;
}

interface GameBoardProps {
	board?: BoardData;
	selectedHole?: BoardHole;
	selectedColor?: PlayerColor;
	disabled?: boolean;
	onHoleClick?: (hole: BoardHole) => void;
}

const BOARD_POSITIONS = Array.from({ length: 9 }, (_, index) => index);
const HOLES = [
	{ size: 2, radius: 40, width: 8, label: "大", filled: false },
	{ size: 1, radius: 24, width: 8, label: "中", filled: false },
	{ size: 0, radius: 9, width: 0, label: "小", filled: true },
] as const;
const PIECE_COLORS: Record<PlayerColor, string> = {
	0: "text-red-500",
	1: "text-blue-500",
	2: "text-emerald-500",
	3: "text-purple-500",
};
const COLOR_LABELS: Record<PlayerColor, string> = {
	0: "赤",
	1: "青",
	2: "緑",
	3: "紫",
};

export function GameBoard({
	board,
	selectedHole,
	selectedColor = 1,
	disabled = false,
	onHoleClick,
}: GameBoardProps) {
	return (
		<fieldset
			className="m-0 min-w-0 w-full max-w-160 border-0 p-0"
			aria-label="ゲーム盤"
		>
			<div className="grid aspect-square grid-cols-3 gap-[3%] rounded-[12%] border border-black p-[7%]">
				{BOARD_POSITIONS.map((position) => (
					<svg
						key={position}
						viewBox="0 0 100 100"
						className="aspect-square w-full overflow-visible"
						aria-label={`盤面 ${position + 1}`}
					>
						<title>{`盤面 ${position + 1}`}</title>
						{HOLES.map(({ size, radius, width, label, filled }) => {
							const hole = { position, size };
							const occupant = board?.[position][size] ?? null;
							const unavailable = disabled || occupant !== null;
							const selected =
								selectedHole?.position === position &&
								selectedHole.size === size;

							return (
								// biome-ignore lint/a11y/useSemanticElements: SVG内の円環はHTML buttonでは表現できないため
								<circle
									key={size}
									cx="50"
									cy="50"
									r={radius}
									fill={filled ? "currentColor" : "none"}
									stroke={filled ? "none" : "currentColor"}
									strokeWidth={width}
									className={`outline-none transition-all focus-visible:drop-shadow-[0_0_3px_currentColor] ${
										occupant !== null
											? `${PIECE_COLORS[occupant]} cursor-not-allowed`
											: selected
												? PIECE_COLORS[selectedColor]
												: disabled
													? "cursor-not-allowed text-stone-300"
													: "cursor-pointer text-stone-400 hover:text-stone-700"
									}`}
									role="button"
									tabIndex={unavailable ? -1 : 0}
									aria-label={
										occupant !== null
											? `${position + 1}番の${label}サイズ、${COLOR_LABELS[occupant]}の駒を配置済み`
											: `${position + 1}番の${label}サイズの穴`
									}
									aria-disabled={unavailable}
									aria-pressed={selected}
									onClick={() => {
										if (!unavailable) onHoleClick?.(hole);
									}}
									onKeyDown={(event) => {
										if (
											!unavailable &&
											(event.key === "Enter" || event.key === " ")
										) {
											event.preventDefault();
											onHoleClick?.(hole);
										}
									}}
								/>
							);
						})}
					</svg>
				))}
			</div>
		</fieldset>
	);
}
