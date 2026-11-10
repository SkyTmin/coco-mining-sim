--!strict

local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage").Shared
local Circle = require(Shared.Play.Circle)
local Upgrade = require(Shared.Play.Upgrade)
local Worlds = require(Shared.Mine.Worlds)
local State = require(Shared.Mine.MineState)
local Remotes = require(Shared.Remotes)
local MineService = require(script.Parent.MineService)
local ProfileService = require(script.Parent.ProfileService)

local UpgradeService = {}
local lastAt: { [Player]: number } = {}

local function intent(op: any, a: any, b: any): Upgrade.Purchase?
	if op == "BuyHitSize" then
		return { kind = "hitSize", count = 1 }
	elseif op == "BuyWidth" then
		return { kind = "width", count = 1 }
	elseif op == "BuyPickLevel" and Upgrade.count(a) then
		return { kind = "pick", count = a }
	elseif
		op == "BuyCard"
		and type(a) == "string"
		and table.find(Upgrade.cards, a)
		and Upgrade.count(b)
	then
		return { kind = "card", id = a, count = b }
	end
	return nil
end

function UpgradeService.Start()
	Remotes.event("UpgradeIntent").OnServerEvent
		:Connect(function(player: Player, op: any, a: any, b: any)
			local at = Upgrade.nextRequest(lastAt[player] or -math.huge, os.clock())
			if not at then
				return
			end
			lastAt[player] = at
			local purchase = intent(op, a, b)
			local session = MineService.get(player)
			if not purchase or not session then
				return
			end
			local world = Worlds.of(session.state.front).index
			local quote: Upgrade.Quote? = nil
			ProfileService.Mutate(player, function(profile)
				quote = Circle.buy(profile, world, purchase)
				if quote and purchase.kind == "width" then
					assert(State.widen(session.state, quote.level))
				end
			end)
			if quote and purchase.kind == "width" then
				MineService.window(session)
			end
		end)
	Players.PlayerRemoving:Connect(function(player)
		lastAt[player] = nil
	end)
end

return UpgradeService
