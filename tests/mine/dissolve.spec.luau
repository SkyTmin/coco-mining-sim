--!strict
local Test = require("../lib/expect")
local R = require("./fixture").load("DissolveRules")
Test.describe("Dissolve timing and budgets", function()
	Test.it("finishes each ghost within 0.45 seconds and limits the two visual modes", function()
		assert(R.delay + R.shrink <= 0.45)
		assert(
			R.normalPieces == 96 and R.normalDust == 600 and R.ultPieces == 120 and R.ultDust == 800
		)
		assert(
			R.pieces == 8
				and R.pieceSize == 2.5
				and R.dustPerPiece == 6
				and R.dustFallback == 12
				and R.dustReduced == 8
		)
	end)
	Test.it("uses the requested center wave, pause and shrink samples", function()
		assert(R.frontDelay(0, 1, 3) == 0)
		assert(R.frontDelay(3, 1, 3) == 0.24)
		assert(R.pause == 0.4 and math.abs(R.pause + R.wave - 1.2) < 1e-9)
		assert(R.sample(0) == 0 and R.sample(0.11) == 0.5 and R.sample(0.22) == 1)
	end)
end)
