--!strict

local Config = require(script.Parent.Parent.Config)
local Types = require(script.Parent.Parent.Types)
local Worlds = require(script.Parent.Parent.Mine.Worlds)
local MineState = require(script.Parent.Parent.Mine.MineState)
local MineCodec = require(script.Parent.Parent.Mine.MineCodec)
local Power = require(script.Parent.Power)
local Upgrade = require(script.Parent.Upgrade)
local Family = require(script.Parent.Family)
local Collection = require(script.Parent.Collection)

type Profile = Types.Profile
export type Pick = Config.PickaxeConfig & {
	level: number,
	strength: number,
	shape: string,
	interval: number,
	ultLayers: number,
	ultCharge: number,
	chestFrequency: number,
	plateMultiplier: number,
}

local Circle = {}
Circle.profileVersion = 3

function Circle.new(): Types.Circle
	return { hitSize = 1, pickLevels = {}, cards = {} }
end

function Circle.initialize(profile: any)
	profile.v = Circle.profileVersion
	profile.circle = Circle.new()
	profile.width = Config.mine.startWidth
	profile.unlocked = { cards = {}, worlds = { ["1"] = true } }
	profile.deepestWorld, profile.platesBroken = 1, 0
	profile.hitCounter, profile.critCounter = 0, 0
	profile.funnel = {}
	Collection.initialize(profile)
end

local function integer(value: any, min: number, max: number): boolean
	return type(value) == "number" and value % 1 == 0 and value >= min and value <= max
end

function Circle.migrate(profile: any): boolean
	if profile.v == 1 then
		Circle.initialize(profile)
		profile.mine = nil
	end
	if profile.v == 2 then
		if type(profile.circle) ~= "table" or type(profile.circle.pickLevels) ~= "table" then
			return false
		end
		Collection.initialize(profile)
		for id in profile.circle.pickLevels do
			if id:match("^plain_") then
				profile.circle.pickLevels[id] = nil
			end
		end
		profile.v = Circle.profileVersion
	end
	if profile.v ~= Circle.profileVersion or not Collection.validate(profile) then
		return false
	end
	local circle, unlocked = profile.circle, profile.unlocked
	if
		type(circle) ~= "table"
		or type(circle.pickLevels) ~= "table"
		or type(circle.cards) ~= "table"
		or not integer(circle.hitSize, 1, #Config.progress.hitSizes)
		or type(unlocked) ~= "table"
		or type(unlocked.cards) ~= "table"
		or type(unlocked.worlds) ~= "table"
		or type(profile.funnel) ~= "table"
		or not integer(profile.deepestWorld, 1, #Config.worlds)
		or not integer(profile.platesBroken, 0, 2 ^ 53 - 1)
		or not integer(profile.hitCounter, 0, 2 ^ 53 - 1)
		or not integer(profile.critCounter, 0, profile.hitCounter)
	then
		return false
	end
	local retired = Config.plots.retiredWidth
	local oldWidth = profile.width
	local retire = oldWidth == retired.width
	local shrink = retire or (oldWidth == 7 and Config.plots.frameWidth == 5)
	local width = if shrink then Config.plots.frameWidth else oldWidth
	local validWidth = false
	for _, stage in Config.progress.widths do
		validWidth = validWidth or stage.w == width
	end
	if not validWidth then
		return false
	end
	for id, level in circle.pickLevels do
		local pick = Config.pickaxes[id]
		local gold = profile.collection[id] and profile.collection[id].golden > 0
		if
			not pick
			or not integer(level, 1, Power.cap(Config.progress.rarities[pick.rarity], gold))
		then
			return false
		end
	end
	for id, level in circle.cards do
		local card = Config.progress.cards[id]
		if
			not table.find(Upgrade.cards, id)
			or not integer(level, 0, card.cap or 4096)
			or Upgrade.cardPrice(card, math.max(0, level - 1)) >= math.huge
		then
			return false
		end
	end
	for _, flags in { unlocked.cards, unlocked.worlds, profile.funnel } do
		for key, value in flags do
			if type(key) ~= "string" or value ~= true then
				return false
			end
		end
	end
	if shrink then
		if profile.mine ~= nil then
			local state = MineCodec.decode(profile.mine)
			if not state or state.width ~= oldWidth or not MineState.narrow(state, width) then
				return false
			end
			profile.mine = MineCodec.encode(state)
		end
		profile.width = width
		if retire then
			profile.coins += retired.refund
		end
	end
	if not Config.pickaxes[profile.pickaxe] then
		profile.pickaxe = "starter"
	end
	if not Family.canEquip(profile, profile.pickaxe, profile.pickaxeGolden) then
		profile.pickaxe, profile.pickaxeGolden = "starter", false
	end
	for _, id in Upgrade.cards do
		if profile.deepestWorld >= Config.progress.cards[id].world then
			profile.unlocked.cards[id] = true
		end
	end
	return true
end

function Circle.pick(id: string, circle: Types.Circle, depth: number, profile: Profile?): Pick
	local pick = Config.pickaxes[id] or Config.pickaxes.starter
	local rarity = Config.progress.rarities[pick.rarity]
	local golden = profile ~= nil and profile.pickaxeGolden
	local level = math.min(circle.pickLevels[id] or 1, Power.cap(rarity, golden))
	local shape = Config.progress.hitSizes[if Upgrade.hitSizeEnabled then circle.hitSize else 1]
	local effects = if profile
		then Family.effects(profile)
		else { strength = 1, ultDepth = 1, chestFrequency = 1, plateDamage = 1 }
	local strength = Power.strength(rarity, level, circle.cards, golden) * effects.strength
	return {
		rarity = pick.rarity,
		family = pick.family,
		storm = pick.storm,
		level = level,
		strength = strength,
		shape = shape.shape,
		interval = shape.interval,
		ultLayers = math.max(
			1,
			math.floor(
				Power.ult(rarity, level, Worlds.durability(depth), strength) * effects.ultDepth
			)
		),
		ultCharge = Config.mine.ultCharge,
		chestFrequency = effects.chestFrequency,
		plateMultiplier = effects.plateDamage,
	}
end

function Circle.context(profile: Profile, world: number): Upgrade.Context
	return {
		coins = profile.coins,
		hitSize = profile.circle.hitSize,
		width = profile.width,
		world = math.max(world, profile.deepestWorld),
		pick = profile.pickaxe,
		golden = profile.pickaxeGolden,
		pickLevel = math.min(
			profile.circle.pickLevels[profile.pickaxe] or 1,
			Power.cap(
				Config.progress.rarities[Config.pickaxes[profile.pickaxe].rarity],
				profile.pickaxeGolden
			)
		),
		cards = profile.circle.cards,
		unlockedCards = profile.unlocked.cards,
	}
end

function Circle.buy(profile: Profile, world: number, purchase: Upgrade.Purchase): Upgrade.Quote?
	local quote = Upgrade.quote(Circle.context(profile, world), purchase)
	local balance = Upgrade.pay(profile.coins, quote)
	if not quote or balance == nil then
		return nil
	end
	profile.coins = balance
	if purchase.kind == "hitSize" then
		profile.circle.hitSize = quote.level
	elseif purchase.kind == "width" then
		profile.width = quote.level
	elseif purchase.kind == "pick" then
		profile.circle.pickLevels[profile.pickaxe] = quote.level
	elseif purchase.id then
		profile.circle.cards[purchase.id] = quote.level
	end
	return quote
end

function Circle.reach(profile: Profile, world: number): { string }
	local unlocked = profile.unlocked
	profile.deepestWorld = math.max(profile.deepestWorld, world)
	for index = 1, world do
		unlocked.worlds[tostring(index)] = true
	end
	local cards = {}
	for _, id in Upgrade.cards do
		if world >= Config.progress.cards[id].world and not unlocked.cards[id] then
			unlocked.cards[id] = true
			table.insert(cards, id)
		end
	end
	return cards
end

return Circle
