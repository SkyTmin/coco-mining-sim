--!strict

local Test = require("./lib/expect")
local Loader = require("./lib/loader")
local Wire = Loader.load("src/shared/Wire.luau")
local expect = Test.expect

Test.describe("Wire", function()
	Test.it("round-trips holes and mixed keys at every depth", function()
		local original = { [1] = "a", [20] = false, nested = { [-3] = 42, [7] = { [4] = "b" } } }
		local encoded = Wire.encode(original)
		expect(encoded["#20"]).toBe(false)
		expect(encoded[1]).toBe(nil)
		expect(Wire.decode(encoded)).toEqual(original)
	end)
end)

return true
