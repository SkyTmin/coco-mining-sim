--!strict

local Test = require("./lib/expect")
local Loader = require("./lib/loader")
local Persistence = Loader.load("src/shared/Persistence.luau")
local expect = Test.expect

Test.describe("Persistence", function()
	Test.it("requires both the job and the acquisition token", function()
		local lock = { job = "server", token = "join-one", at = 10000 }
		expect(Persistence.owns(lock, "server", "join-one")).toBe(true)
		expect(Persistence.owns(lock, "server", "join-two")).toBe(false)
		expect(Persistence.owns(lock, "other-server", "join-one")).toBe(false)
		expect(Persistence.owns(nil, "server", "join-one")).toBe(false)
	end)
	Test.it("expires a lock only after thirty minutes without renewal", function()
		local lock = { job = "server", token = "join-one", at = 10000 }
		expect(Persistence.isStale(lock, 11799)).toBe(false)
		expect(Persistence.isStale(lock, 11800)).toBe(false)
		expect(Persistence.isStale(lock, 11801)).toBe(true)
		lock.at = 11800
		expect(Persistence.isStale(lock, 11801)).toBe(false)
		expect(Persistence.isStale(nil, 11801)).toBe(true)
	end)
end)

return true
