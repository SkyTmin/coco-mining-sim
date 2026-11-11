--!strict

local Config = require(script.Parent.Parent.Config)
local Power = require(script.Parent.Power)

export type Count = number | "max"
export type Quote = { level: number, price: number, amount: number }
export type Purchase = { kind: string, id: string?, count: Count }
export type Context = {
	coins: number,
	hitSize: number,
	width: number,
	world: number,
	pick: string,
	pickLevel: number,
	cards: Power.Cards,
	unlockedCards: { [string]: boolean },
}

local progress = Config.progress
local Upgrade = {}
Upgrade.cards = table.freeze({ "power", "coins", "crit" })
-- [владелец 11.11] «Размер удара» is off for now: every hit is one block
Upgrade.hitSizeEnabled = false
local supportedCards = { power = true, coins = true, crit = true }

function Upgrade.count(value: any): boolean
	return value == 1 or value == 10 or value == "max"
end

function Upgrade.pickPrice(rarity: Config.RarityConfig, level: number): number
	return math.floor(rarity.lvlC0 * progress.pickLevel.costGrowth ^ (level - 1))
end

function Upgrade.cardPrice(card: Config.CardConfig, level: number): number
	return math.floor(card.c0 * progress.cardGrowth ^ level)
end

function Upgrade.nextWidth(width: number): typeof(progress.widths[1])?
	for i, stage in progress.widths do
		if stage.w == width then
			return progress.widths[i + 1]
		end
	end
	return nil
end

function Upgrade.quote(context: Context, purchase: Purchase): Quote?
	local kind, id, count = purchase.kind, purchase.id, purchase.count
	if not Upgrade.count(count) then
		return nil
	end
	if kind == "hitSize" then
		if not Upgrade.hitSizeEnabled then
			return nil
		end
		local stage = progress.hitSizes[context.hitSize + 1]
		return if stage then { level = stage.id, price = stage.price, amount = 1 } else nil
	elseif kind == "width" then
		local stage = Upgrade.nextWidth(context.width)
		if not stage or context.world < (stage.world or 1) then
			return nil
		end
		return { level = stage.w, price = stage.price, amount = 1 }
	end

	local level: number
	local cap: number
	local priceAt: (number) -> number
	if kind == "pick" then
		local rarity = progress.rarities[Config.pickaxes[context.pick].rarity]
		level, cap = context.pickLevel, Power.cap(rarity)
		priceAt = function(current)
			return Upgrade.pickPrice(rarity, current)
		end
	elseif kind == "card" and id and supportedCards[id] and context.unlockedCards[id] then
		local card = progress.cards[id]
		level, cap = context.cards[id] or 0, card.cap or math.huge
		priceAt = function(current)
			return Upgrade.cardPrice(card, current)
		end
	else
		return nil
	end
	if level >= cap then
		return nil
	end

	local limit = math.min(cap, if count == "max" then math.huge else level + count)
	local total, bought = 0, 0
	while level + bought < limit do
		local price = priceAt(level + bought)
		local nextTotal = total + price
		if nextTotal >= math.huge or (count == "max" and nextTotal > context.coins) then
			break
		end
		total, bought = nextTotal, bought + 1
	end
	if bought == 0 then
		return nil
	end
	return { level = level + bought, price = total, amount = bought }
end

function Upgrade.pay(coins: number, quote: Quote?): number?
	if quote and coins >= quote.price then
		return coins - quote.price
	end
	return nil
end

function Upgrade.available(context: Context): boolean
	for _, kind in { "hitSize", "width", "pick" } do
		if Upgrade.pay(context.coins, Upgrade.quote(context, { kind = kind, count = 1 })) then
			return true
		end
	end
	for _, id in Upgrade.cards do
		if
			Upgrade.pay(
				context.coins,
				Upgrade.quote(context, { kind = "card", id = id, count = 1 })
			)
		then
			return true
		end
	end
	return false
end

function Upgrade.morphs(id: string, before: number, after: number): { number }
	local milestones = {}
	local rule = progress.cards[id]
	for i, level in rule.steps do
		if before < level and level <= after and (id ~= "coins" or i == 1) then
			table.insert(milestones, level)
		end
	end
	return milestones
end

function Upgrade.nextRequest(last: number, now: number): number?
	return if now - last >= 0.1 - 1e-9 then now else nil
end

return Upgrade
