--!strict
-- [владелец] TZ-03f §10. Durations and concurrent visual budgets.
local Rules = {
	pieces = 8,
	pieceSize = 2.5,
	delay = 0.16,
	shrink = 0.22,
	pierceDelay = 0.04,
	travel = 0.6,
	angle = math.rad(25),
	dustPerPiece = 6,
	dustFallback = 12,
	dustReduced = 8,
	normalPieces = 96,
	normalDust = 600,
	ultPieces = 120,
	ultDust = 800,
	pause = 0.4,
	wave = 0.8,
	waveDelay = 0.08,
	stormRate = 60,
}
function Rules.sample(age: number): number
	return math.clamp(age / Rules.shrink, 0, 1)
end
function Rules.stagger(cells: { { x: number, y: number } }, height: number): { number }
	local counts, delays = {}, {}
	for i, cell in cells do
		local lane = cell.x * height + cell.y
		local rank = counts[lane] or 0
		delays[i] = Rules.pierceDelay * math.min(3, rank)
		counts[lane] = rank + 1
	end
	return delays
end
function Rules.frontDelay(x: number, y: number, height: number): number
	return Rules.waveDelay * math.sqrt(x * x + (y - (height - 1) / 2) ^ 2)
end
return table.freeze(Rules)
