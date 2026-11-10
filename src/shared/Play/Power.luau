--!strict
--!native

local Config = require(script.Parent.Parent.Config)
local Hash = require(script.Parent.Parent.Mine.Hash)

export type Cards = { [string]: number }
export type Strike = {
	strength: number,
	coinMultiplier: number,
	heavy: boolean,
	crit: boolean,
	mega: boolean,
	rain: boolean,
	cracks: boolean,
	powerPierce: boolean,
	critPierce: boolean,
}

local mine, progress = Config.mine, Config.progress
local Power = {}

function Power.strength(
	rarity: Config.RarityConfig,
	level: number,
	cards: Cards,
	gold: boolean?
): number
	local base = rarity.power * progress.pickLevel.powerPerLevel ^ (level - 1)
	return base
		* (1 + progress.cards.power.per) ^ (cards.power or 0)
		* (if gold then progress.gold.power else 1)
end

function Power.cap(rarity: Config.RarityConfig, gold: boolean?): number
	return rarity.cap + (if gold then progress.gold.capBonus else 0)
end

function Power.hits(hardness: number, strength: number): number
	return math.clamp(math.ceil(hardness / strength), 1, mine.maxHitsPerBlock)
end

function Power.blockHP(hardness: number, strength: number): number
	return math.min(hardness, strength * mine.maxHitsPerBlock)
end

function Power.pierce(hardness: number, strength: number, strike: Strike?): number
	local layers = 1
	for _, threshold in mine.passThrough do
		if strength >= threshold * hardness then
			layers += 1
		end
	end
	if strike then
		if strike.powerPierce and layers > 1 then
			layers += progress.cardEffects.powerPierce
		end
		if strike.critPierce then
			layers += progress.cardEffects.critPierce
		end
	end
	return layers
end

function Power.coins(price: number, cardLevel: number, multiplier: number?): number
	return math.max(1, math.floor(price * (1 + progress.cards.coins.per * cardLevel)))
		* (multiplier or 1)
end

function Power.ult(
	rarity: Config.RarityConfig,
	level: number,
	hardness: number,
	strength: number
): number
	local layers = math.floor(rarity.ult * progress.pickLevel.ultPerLevel ^ (level - 1))
	return math.max(1, math.floor(layers / Power.hits(hardness, strength)))
end

function Power.plate(strength: number, hp: number, ability: boolean): number
	local amount = strength * (if ability then mine.plate.ultMultiplier else 1)
	return math.max(amount, hp / mine.plate.cap)
end

function Power.strike(
	seed: number,
	counter: number,
	crits: number,
	strength: number,
	cards: Cards
): Strike
	local levels, effects = progress.cards, progress.cardEffects
	local power, coins, crit = cards.power or 0, cards.coins or 0, cards.crit or 0
	local heavy = power >= levels.power.steps[1] and counter % effects.heavyEvery == 0
	local critical = Hash.unit(seed, counter, 731) < crit * levels.crit.per
	local mega = critical and crit >= levels.crit.steps[1] and (crits + 1) % effects.megaEvery == 0
	local rain = coins >= levels.coins.steps[1]
		and Hash.unit(seed, counter, 733) < effects.rainChance
	local critMult = if mega
		then effects.megaMultiplier
		elseif critical then effects.critMultiplier
		else 1
	return {
		strength = strength * critMult * (if heavy then effects.heavyMultiplier else 1),
		coinMultiplier = critMult * (if rain then effects.rainMultiplier else 1),
		heavy = heavy,
		crit = critical,
		mega = mega,
		rain = rain,
		cracks = power >= levels.power.steps[2],
		powerPierce = power >= levels.power.steps[3],
		critPierce = critical and crit >= levels.crit.steps[2],
	}
end

-- Fractional crack progress occupies the existing one-byte damage field.
function Power.packDamage(progressDone: number): number
	return math.clamp(math.floor(progressDone * 255 + 0.5), 1, 254)
end

return Power
