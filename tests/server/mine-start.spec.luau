--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Circle = Loader.load("src/shared/Play/Circle.luau")
local expect = Test.expect

Test.describe("Mine startup", function()
	Test.it("opens a mine when the profile loads before the PlayerAdded plot assignment", function()
		local players = { PlayerRemoving = { Connect = function() end } }
		local runService = { Heartbeat = { Connect = function() end } }
		local player = { Parent = players }
		local profile = { coins = 0, pickaxe = "starter" }
		Circle.initialize(profile)
		local onLoaded: ((any) -> ())? = nil
		local assigned: number? = nil
		local loader
		loader = Loader.withOverrides({
			["src/shared/Remotes.luau"] = { event = function() end },
			["src/server/Services/ProfileService.luau"] = {
				OnLoaded = function(callback)
					onLoaded = callback
				end,
				BeforeSave = function() end,
				Get = function()
					return profile
				end,
			},
			["src/server/Services/PlotService.luau"] = {
				get = function()
					return assigned
				end,
				assign = function(owner)
					assert(owner == player)
					assigned = 1
					return assigned
				end,
			},
		}, {
			game = {
				GetService = function(_, name)
					return if name == "Players"
						then players
						elseif name == "RunService" then runService
						else { Shared = loader.node("src/shared") }
				end,
			},
			workspace = {
				GetServerTimeNow = function()
					return 1000
				end,
			},
			task = { spawn = function() end },
			Random = {
				new = function()
					return {
						NextInteger = function()
							return 91
						end,
					}
				end,
			},
		})
		local service = loader.load("src/server/Services/MineService.luau")
		local window: any = nil
		service.window = function(session)
			window = session
		end

		service.Start()
		assert(onLoaded)(player)
		expect(window.plot).toBe(1)
		expect(window.state.front).toBe(0)
		expect(service.get(player)).toBe(window)
	end)
end)

return true
