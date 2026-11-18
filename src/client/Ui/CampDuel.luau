--!strict
local Shared = game:GetService("ReplicatedStorage").Shared
local Candy = require(script.Parent.Candy)
local Burst = require(script.Parent.Parent.Fx.RewardBurst)
local Sfx = require(Shared.Sfx)
local Remotes = require(Shared.Remotes)
local CampDuel = {}
function CampDuel.start(parent: Instance, tr: any)
	local layer = Candy.layer(parent, "DuelHud", 10)
	local badge =
		Candy.panel(layer, "Score", UDim2.fromScale(0.56, 0.085), UDim2.fromScale(0.22, 0.07))
	local label =
		Candy.text(badge, "DuelScore", UDim2.fromScale(0.96, 0.95), UDim2.fromScale(0.02, 0), 18)
	local count = Candy.text(
		layer,
		"Countdown",
		UDim2.fromScale(0.4, 0.25),
		UDim2.fromScale(0.3, 0.35),
		58,
		Candy.white
	)
	Candy.stroke(count, 3, true)
	local match = nil
	local generation = 0
	layer.Visible = false
	Remotes.event("CampSignal").OnClientEvent:Connect(function(kind, a, b, c, d, e)
		if kind == "duelStart" then
			generation += 1
			match = { a = a, b = b, at = c, stop = d, x = 0, y = 0, last = -1 }
			layer.Visible = true
		elseif kind == "score" and match then
			match.x, match.y = a, b
		elseif kind == "duelEnd" then
			match = nil
			generation += 1
			local stamp = generation
			count.Text = ""
			local key = if e
				then "camp_abort"
				elseif a == "win" then "camp_win"
				elseif a == "draw" then "camp_draw"
				else "camp_loss"
			label.Text = string.format("%s   %d : %d", tr(key), b, c)
			if a == "win" and not e then
				Burst.show({
					icon = "coin",
					palette = Burst.palettes.legendary,
					power = 1,
					kicker = tr("camp_duel"),
					title = tr(key),
					subtitle = label.Text .. "   +" .. require(Shared.Format).short(d),
				})
			end
			task.delay(3, function()
				if generation == stamp then
					layer.Visible = false
				end
			end)
		end
	end)
	game:GetService("RunService").Heartbeat:Connect(function()
		if not match then
			return
		end
		local now = workspace:GetServerTimeNow()
		local n = math.max(0, math.ceil(match.at - now))
		if n ~= match.last then
			Sfx.play("link_note", 0.52, if n == 0 then 1.4 else 0.92)
			match.last = n
		end
		count.Text = if n > 0 then tostring(n) else ""
		label.Text = string.format(
			"%s  %d : %d  %s   ·   ⏱ %d",
			match.a,
			match.x,
			match.y,
			match.b,
			math.clamp(math.ceil(match.stop - now), 0, require(Shared.Config).social.duelSeconds)
		)
	end)
end
return CampDuel
