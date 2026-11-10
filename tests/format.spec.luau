--!strict

local Test = require("./lib/expect")
local Loader = require("./lib/loader")
local Format = Loader.load("src/shared/Format.luau")
local expect = Test.expect

Test.describe("Format", function()
	local cases = {
		{ 0, "0" },
		{ 7, "7" },
		{ 999, "999" },
		{ 1000, "1.00K" },
		{ 1149, "1.14K" },
		{ 1150, "1.15K" },
		{ 1999, "1.99K" },
		{ 11500, "11.5K" },
		{ 115000, "115K" },
		{ 999999, "999K" },
		{ 1e6, "1.00M" },
		{ 1.15e12, "1.15T" },
		{ -1500, "-1.50K" },
		{ 1e33, "1.00Dc" },
		{ 1.15e36, "1.15e36" },
	}
	for _, case in cases do
		Test.it("short " .. tostring(case[1]), function()
			expect(Format.short(case[1])).toBe(case[2])
		end)
	end
	Test.it("groups with narrow nonbreaking spaces", function()
		expect(Format.grouped(12540)).toBe("12\u{202F}540")
		expect(Format.grouped(-1254000)).toBe("-1\u{202F}254\u{202F}000")
	end)
end)

return true
