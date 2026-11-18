--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Rules = Loader.load("src/shared/Play/CampRules.luau")
Test.describe("Camp roles", function()
	Test.it("admits four spectators independently of the two helper slots", function()
		local roles = { "viewer", "viewer", "viewer", "guest" }
		assert(Rules.space(roles, "viewer") and Rules.space(roles, "guest"))
		table.insert(roles, "viewer")
		assert(not Rules.space(roles, "viewer") and Rules.space(roles, "guest"))
		table.insert(roles, "guest")
		assert(not Rules.space(roles, "guest"))
	end)
end)
return true
