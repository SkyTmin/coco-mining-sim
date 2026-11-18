--!strict
local Roblox = require("@lune/roblox")
local Loader = require("../lib/loader")
local Test = require("../lib/expect")

Test.describe("Camp geometry", function()
	Test.it(
		"builds eight entrances, nine distinct arches and the budgeted lights on Roblox instances",
		function()
			local world = Roblox.Instance.new("Workspace")
			world.StreamingEnabled = true
			local env = table.clone(Roblox)
			local rs = {}
			local signal = { Connect = function() end }
			local players = {
				PlayerAdded = signal,
				PlayerRemoving = signal,
				GetPlayers = function()
					return {}
				end,
			}
			env.game = {
				GetService = function(_, name)
					return if name == "Players" then players else rs
				end,
			}
			env.workspace = world
			-- Tallest rim and shortest rock blocks exercise the upper bound on the number of parts.
			env.Random = {
				new = function()
					return {
						NextNumber = function(_, low)
							return low
						end,
						NextInteger = function(_, _, high)
							return high
						end,
					}
				end,
			}
			local loader = Loader.withOverrides({
				["src/shared/Remotes.luau"] = {
					func = function()
						return {}
					end,
				},
			}, env)
			rs.Shared = loader.node("src/shared")
			local cfg = loader.load("src/shared/Config")
			local plot = loader.load("src/server/Services/PlotService.luau")
			local builder = loader.load("src/server/Camp/CampBuilder.luau")
			plot.Start()
			local signatures = {}
			local largest, heaviest = 0, ""
			local entry = builder.get(1)
			for i = 0, #cfg.rebirth.ranks do
				local id = if i == 0 then "none" else cfg.rebirth.ranks[i].id
				entry.setLook(id, true)
				local arch = entry.model.Arch
				local n = 0
				local details = {}
				for _, d in arch.RankTrim:GetDescendants() do
					table.insert(details, d.Name)
					if d:IsA("BasePart") then
						n += 1
					end
				end
				table.sort(details)
				local signature = tostring(arch.Pier.Color)
					.. "/"
					.. tostring(arch.Pier.Material)
					.. "/"
					.. table.concat(details, ",")
				assert(not signatures[signature], id .. " repeats an arch")
				signatures[signature] = true
				if n > largest then
					largest, heaviest = n, id
				end
				assert(arch:FindFirstChildWhichIsA("Fire", true) ~= nil == (i == 8))
			end
			for i = 1, cfg.plots.count do
				local arch = builder.get(i)
				assert(#arch.showcase == 4 and arch.chestShelf:IsA("Attachment"))
				assert(arch.model:FindFirstChild("ChestShelf", true) == arch.chestShelf)
				assert(arch.chestShelf:GetAttribute("Footprint") == Roblox.Vector2.new(20, 10))
				arch.setLook(heaviest, true)
				arch.setLight(Roblox.Color3.fromRGB(120, 210, 255), false)
				assert(arch.model.Arch.WorldLight.SurfaceLight.Enabled)
				arch.setLight(nil)
				assert(not arch.model.Arch.WorldLight.SurfaceLight.Enabled)
			end
			local parts, points, surfaces, paths = 0, 0, 0, 0
			for _, d in world:GetDescendants() do
				if d:IsA("BasePart") then
					parts += 1
				end
				if d:IsA("PointLight") then
					points += 1
				end
				if d:IsA("SurfaceLight") then
					surfaces += 1
				end
				if d.Name == "Path" then
					paths += 1
				end
			end
			print(
				string.format(
					"Camp geometry (worst rim/trim, Camp + Plots): %d BaseParts, %d PointLights, %d SurfaceLights",
					parts,
					points,
					surfaces
				)
			)
			assert(
				parts <= cfg.camp.partBudget
					and points == cfg.camp.lightBudget
					and surfaces == cfg.plots.count
			)
			assert(
				paths == 8
					and world.Camp:FindFirstChild("TopBoard")
					and world.Camp:FindFirstChild("SurveyInstrument")
			)
			world:Destroy()
		end
	)
end)
return true
