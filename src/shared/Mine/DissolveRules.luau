--!strict
-- [владелец] TZ-03f §10. Durations and concurrent visual budgets.
local Rules = {
	pieces = 8,
	pieceSize = 2.5,
	delay = 0.16,
	shrink = 0.22,
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
function Rules.frontDelay(x: number, y: number, height: number): number
	return Rules.waveDelay * math.sqrt(x * x + (y - (height - 1) / 2) ^ 2)
end
return table.freeze(Rules)
