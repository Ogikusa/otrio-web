export type BoardHoleSize = 0 | 1 | 2;

export interface BoardHole {
	position: number;
	size: BoardHoleSize;
}

interface GameBoardProps {
	selectedHole?: BoardHole;
	onHoleClick?: (hole: BoardHole) => void;
}

const BOARD_POSITIONS = Array.from({ length: 9 }, (_, index) => index);
const HOLES = [
	{ size: 2, radius: 40, width: 8, label: "大", filled: false },
	{ size: 1, radius: 24, width: 8, label: "中", filled: false },
	{ size: 0, radius: 9, width: 0, label: "小", filled: true },
] as const;

export function GameBoard({ selectedHole, onHoleClick }: GameBoardProps) {
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
									className={`cursor-pointer outline-none transition-all focus-visible:stroke-blue-600 ${
										selected
											? "text-blue-600"
											: "text-black hover:text-stone-500"
									}`}
									role="button"
									tabIndex={0}
									aria-label={`${position + 1}番の${label}サイズの穴`}
									aria-pressed={selected}
									onClick={() => onHoleClick?.(hole)}
									onKeyDown={(event) => {
										if (event.key === "Enter" || event.key === " ") {
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
