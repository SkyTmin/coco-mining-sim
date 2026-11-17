--!strict
local Config = require(script.Parent.Parent.Config)
local Power = require(script.Parent.Power)
local Income = {}
function Income.finite(value: any): boolean
	return type(value) == "number" and value >= 0 and value < math.huge
end
function Income.permanent(profile: any, effects: any): number
	return (1 + profile.cups) * effects.coins
end
function Income.temporary(list: { number }, cap: number?): number
	local total = 1
	for _, value in list do
		if not Income.finite(value) or value < 1 then
			return 0 / 0
		end
		total += value - 1
	end
	return math.min(total, cap or Config.income.temporaryCap)
end
function Income.context(
	profile: any,
	effects: any,
	temporary: { number }?,
	now: number?,
	feverUntil: number?
): any
	return {
		P = Income.permanent(profile, effects),
		T = Income.temporary(temporary or {}),
		F = if now and feverUntil and now < feverUntil then Config.events.fever.multiplier else 1,
	}
end
function Income.multiplier(ctx: any, source: number?): number
	return ctx.P * ctx.T * ctx.F * (source or 1)
end
function Income.valid(ctx: any): boolean
	return Income.finite(ctx.P)
		and ctx.P >= 1
		and Income.finite(ctx.T)
		and ctx.T >= 1
		and ctx.T <= Config.income.temporaryCap
		and Income.finite(ctx.F)
		and ctx.F >= 1
		and Income.finite(Income.multiplier(ctx))
end
-- A conservative bound rejects nonfinite arithmetic before any mutation.
local maxPrice, maxPlate, maxChest = 0, 0, 0
for _, world in Config.worlds do
	for _, price in world.prices do
		maxPrice = math.max(maxPrice, price)
	end
	maxPlate = math.max(maxPlate, world.plate.reward)
end
for _, tier in Config.chests.wall.tiers do
	maxChest = math.max(maxChest, tier.blocks)
end
local maxSource = Config.progress.cardEffects.megaMultiplier
	* Config.progress.cardEffects.rainMultiplier
for _, family in Config.families do
	maxSource = math.max(maxSource, family.ult.coinMultiplier or 1)
end
maxSource = math.max(maxSource, Config.events.bomb.coinMultiplier)
function Income.safeAction(profile: any, effects: any, ctx: any): boolean
	local level = profile.circle.cards.coins or 0
	if not Income.valid(ctx) or not Income.finite(profile.coins) or not Income.finite(level) then
		return false
	end
	local perCell = Power.coins(maxPrice * maxChest, level)
			* effects.chestCoins
			* Config.progress.cardEffects.chestMultiplier
			* maxSource
		+ maxPlate
	local bound = perCell
		* Config.mine.maxDepth
		* Config.mine.maxWidth
		* Config.mine.maxHeight
		* Income.multiplier(ctx)
	return Income.finite(bound + profile.coins)
end
return Income
