--!strict

local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Validate = Loader.load("src/shared/Mine/Validate.luau")
local State = Loader.load("src/shared/Mine/MineState.luau")
local expect = Test.expect

Test.describe("Server mining validation", function()
	Test.it("rejects other plots, occluded cells, voids, and invalid coordinates", function()
		local st = State.new(3, 5, 3)
		expect(Validate.target(st, false, 0, 0, 0)).toBe(nil)
		expect(Validate.target(st, true, 3, 0, 0)).toBe(nil)
		expect(Validate.target(st, true, 0, -1, 0)).toBe(nil)
		expect(Validate.target(st, true, 0, 0, 20)).toBe(nil)
		expect(Validate.target(st, true, 0, 0, 0.5)).toBe(nil)
		expect(Validate.target(st, true, "0", 0, 0)).toBe(nil)
		expect(Validate.target(st, true, 0, 0, 1)).toBe(nil)
		expect(Validate.target(st, true, 0, 0, 0)).toBe(0)
		State.removeCell(st, 0, 0, 0, {})
		expect(Validate.target(st, true, 0, 0, 0)).toBe(nil)
		expect(Validate.target(st, true, 0, 0, 1)).toBe(1)
	end)
	Test.it("bounds burst size and refills at the pickaxe interval", function()
		local bucket = Validate.bucket(0)
		local accepted = 0
		for _ = 1, 50 do
			if Validate.take(bucket, 0, 0.35) then
				accepted += 1
			end
		end
		expect(accepted).toBe(3)
		expect(Validate.take(bucket, 0.34, 0.35)).toBe(false)
		expect(Validate.take(bucket, 0.36, 0.35)).toBe(true)
		expect(Validate.take(bucket, 0.36, 0.35)).toBe(false)
		local afterPause = 0
		for _ = 1, 10 do
			if Validate.take(bucket, 12, 0.35) then
				afterPause += 1
			end
		end
		expect(afterPause).toBe(3)
	end)
end)

return true
