--!strict
local Config = require(script.Parent.Parent.Config)
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
return Income
