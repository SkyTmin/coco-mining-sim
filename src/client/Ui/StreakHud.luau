--!strict
-- «Разгон» on the HUD [владелец 13.11: «сделай также, понятно и ясно»]: a pill under the wallet — «Разгон ×1,5» and a
-- bar to the next tier — instead of the dotted ring round the ult button. It appears once the first tier is reached
-- [02: «разгон спрятан, пока не набран»] and hides a few seconds after the gauge falls to zero.
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Streak = require(Shared.Play.Streak)
local Sfx = require(Shared.Sfx)
local Candy = require(script.Parent.Candy)
local BoostPill = require(script.Parent.BoostPill)
local StreakHud = {}

local function progress(gauge: number, tier: number): number
	local tiers = Config.events.streak.tiers
	local from = tiers[tier] or 0
	local to = tiers[tier + 1]
	if not to then
		return 1
	end
	return (gauge - from) / (to - from)
end

function StreakHud.new(hud: any, translate: (string, ...any) -> string): any
	local cfg = Config.events.hud
	local state = Streak.new(workspace:GetServerTimeNow())
	local unlocked, lastTier, pulseAt, zeroAt = false, 0, -math.huge, nil
	local pill = BoostPill.new(hud.wallet, "Rush", "power", Candy.purple)
	return {
		tier = function()
			return Streak.tier(state)
		end,
		sync = function(res: any, now: number)
			state.gauge = res.streak / Config.events.streakWireScale
			state.at, state.lastHit = now, now
			if res.streakTier > lastTier then
				pulseAt = now
				Sfx.play("streak_step", cfg.gain, 1 + res.streakTier * cfg.pitchStep)
			end
			lastTier = res.streakTier
			unlocked = unlocked or lastTier > 0
		end,
		clear = function()
			state = Streak.new(workspace:GetServerTimeNow())
			unlocked = false
			lastTier = 0
			BoostPill.show(pill, false)
		end,
		step = function(now: number, frozen: boolean, active: boolean, reduced: boolean)
			Streak.decay(state, now, frozen)
			local tier = Streak.tier(state)
			if state.gauge > 0 then
				zeroAt = nil
			else
				zeroAt = zeroAt or now
			end
			BoostPill.show(
				pill,
				active
					and unlocked
					and (not zeroAt or now - zeroAt < Config.events.streakHideSeconds),
				reduced
			)
			if pill.shown then
				BoostPill.set(
					pill,
					translate("streak_label") .. " " .. translate("streak_" .. tier),
					progress(state.gauge, tier)
				)
				-- a tier step flashes the plate white for a moment
				local flash = not reduced and now - pulseAt < cfg.pulseSeconds
				pill.icon.ImageColor3 = if flash then Candy.purple else Candy.white
				local plate = pill.icon.Parent :: Frame
				plate.BackgroundColor3 = if flash then Candy.white else Candy.purple
			end
		end,
	}
end
return StreakHud
