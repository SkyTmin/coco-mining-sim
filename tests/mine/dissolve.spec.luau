--!strict
local Test = require("../lib/expect")
local R = require("./fixture").load("DissolveRules")
Test.describe("Grain release and budgets", function()
	Test.it(
		"releases radially from the hit within 140 ms with smooth deterministic noise",
		function()
			assert(R.delay(0, 0) == 0)
			assert(math.abs(R.delay(3.75, 1) - 0.14) < 1e-9)
			assert(R.delay(9, 1) == R.delay(3.75, 1))
			for i = 0, 100 do
				local x = i / 10
				local n = R.noise(x, 2, 57)
				assert(n >= 0 and n <= 1 and n == R.noise(x, 2, 57))
				assert(math.abs(n - R.noise(x + 0.001, 2, 57)) < 0.01)
			end
		end
	)
	Test.it(
		"uses the same size and every second grid cell for reduced motion and overload",
		function()
			assert(R.grid == 8 and R.size == 0.625 and R.smallSize == 0.3125)
			assert(R.stride(1, 400, false) == 1 and R.stride(3, 192, false) == 1)
			assert(R.stride(1, 63, false) == 2 and R.stride(3, 191, false) == 2)
			assert(R.stride(1, 400, true) == 2)
			assert(R.stride(3, 47, true) == 0 and R.stride(0, 400, false) == 0)
			assert(R.maxEmit == 400 and R.maxParticles == 4000)
		end
	)
	Test.it("matches exponential relaxation to the requested upward velocity", function()
		for _, t in { 0.2, 0.4, 0.6 } do
			local x, y, z = R.position(t, 2.1, 0, 0)
			local k = (1 - math.exp(-2.5 * t)) / 2.5
			assert(math.abs(x - 2.1 * k) < 1e-9 and z == 0)
			assert(math.abs(y - 4.06 * (t - k)) < 1e-9)
		end
		assert(math.abs(R.drag - 2.5 / math.log(2)) < 1e-9)
	end)
end)
