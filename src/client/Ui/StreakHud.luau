--!strict
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Streak = require(Shared.Play.Streak)
local Sfx = require(Shared.Sfx)
local Candy = require(script.Parent.Candy)
local StreakHud = {}
function StreakHud.new(hud: any, translate: (string, ...any) -> string): any
	local cfg = Config.events.hud
	local state = Streak.new(workspace:GetServerTimeNow())
	local unlocked, lastTier, pulseAt, zeroAt = false, 0, -math.huge, nil
	local ticks = {}
	local container =
		Candy.frame(hud.ult.Parent, "RushArc", UDim2.fromScale(1, 1), UDim2.fromScale(0, 0))
	for i = 1, cfg.ticks do
		local angle = (i - 1) * math.pi * 2 / cfg.ticks
		local tick = Candy.frame(
			container,
			"Rush",
			UDim2.fromOffset(cfg.tickPixels, cfg.tickPixels),
			UDim2.fromScale(0.5 + math.sin(angle) * cfg.radius, 0.5 - math.cos(angle) * cfg.radius),
			Candy.purple
		)
		tick.AnchorPoint = Vector2.new(0.5, 0.5)
		tick.Rotation = math.deg(angle)
		table.insert(ticks, tick)
	end
	local label = Candy.text(
		container,
		"RushLabel",
		UDim2.fromOffset(cfg.labelWidth, cfg.labelHeight),
		UDim2.fromOffset(cfg.labelX, cfg.labelY),
		cfg.fontSize
	)
	local pill = Candy.text(
		hud.wallet,
		"TemporaryMultiplier",
		UDim2.fromOffset(cfg.labelWidth, cfg.labelHeight),
		UDim2.fromScale(0, 1),
		cfg.fontSize,
		Candy.purple
	)
	container.Visible, pill.Visible = false, false
	return {
		sync = function(res: any, now: number)
			state.gauge = res.streak / Config.events.streakWireScale
			state.at, state.lastHit = now, now
			if res.streakTier > lastTier then
				pulseAt = now
				Sfx.play("level_tick", cfg.gain, 1 + res.streakTier * cfg.pitchStep)
			end
			lastTier = res.streakTier
			unlocked = unlocked or lastTier > 0
		end,
		clear = function()
			state = Streak.new(workspace:GetServerTimeNow())
			unlocked = false
			lastTier = 0
			container.Visible, pill.Visible = false, false
		end,
		step = function(now: number, frozen: boolean, active: boolean, reduced: boolean)
			Streak.decay(state, now, frozen)
			local tier = Streak.tier(state)
			if state.gauge > 0 then
				zeroAt = nil
			else
				zeroAt = zeroAt or now
			end
			container.Visible = active
				and unlocked
				and (not zeroAt or now - zeroAt < Config.events.streakHideSeconds)
			pill.Visible = active and tier > 0
			label.Text, pill.Text =
				translate("streak_label") .. " " .. translate("streak_" .. tier),
				translate("streak_" .. tier)
			for i, tick in ticks do
				tick.Visible = i <= math.ceil(state.gauge / Config.events.streak.cap * cfg.ticks)
				tick.BackgroundTransparency = if not reduced
						and now - pulseAt < cfg.pulseSeconds
					then 0
					else 0.25
			end
		end,
	}
end
return StreakHud
