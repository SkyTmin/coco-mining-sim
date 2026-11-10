--!strict

local process = require("@lune/process")
local Loader = require("../../tests/lib/loader")
local Config = Loader.load("src/shared/Config")
local State = Loader.load("src/shared/Mine/MineState.luau")
local Resolve = Loader.load("src/shared/Mine/Resolve.luau")
local Worlds = Loader.load("src/shared/Mine/Worlds.luau")
local Economy = Loader.load("src/shared/Mine/Economy.luau")
local Circle = Loader.load("src/shared/Play/Circle.luau")
local Power = Loader.load("src/shared/Play/Power.luau")
local Upgrade = Loader.load("src/shared/Play/Upgrade.luau")
local Format = Loader.load("src/shared/Format.luau")
local Strings = Loader.load("src/shared/Strings")

type PickChange = { at: number, id: string }
type Purchase = { kind: string, count: number, id: string? }
local usage =
	"lune run scripts/sim/run.luau -- [minutes] [active|kid] [--picks=3:45:plain_common,15:00:plain_rare]"
local args = table.clone(process.args)
if args[1] == "--" then
	table.remove(args, 1)
end
local minutes = if args[1] then tonumber(args[1]) else 60
local style = args[2] or "active"
assert(minutes and minutes > 0 and minutes < math.huge, usage)
assert(style == "active" or style == "kid", usage)
assert(#args <= 3, usage)

local schedule: { PickChange } = {}
if args[3] then
	local changes = args[3]:match("^%-%-picks=(.+)$")
	assert(changes, usage)
	for change in changes:gmatch("[^,]+") do
		local m, s, id = change:match("^(%d+):(%d%d):(plain_%l+)$")
		assert(
			m and s and id and Config.pickaxes[id] and tonumber(s) < 60,
			"Invalid pick schedule: " .. change
		)
		table.insert(schedule, { at = tonumber(m) * 60 + tonumber(s), id = id })
	end
	table.sort(schedule, function(a, b)
		return a.at < b.at
	end)
end

local function clock(seconds: number): string
	return string.format("%d:%02d", seconds // 60, seconds % 60 // 1)
end

local function event(at: number, description: string)
	print("| " .. clock(at) .. " | " .. description .. " |")
end

local purchases: { Purchase } = {
	{ kind = "hitSize", count = 1 },
	{ kind = "width", count = 1 },
	{ kind = "pick", count = 1 },
}
for _, id in Upgrade.cards do
	table.insert(purchases, { kind = "card", id = id, count = 1 })
end
local hitShape = { "1×1", "1×2", "1×3", "крест (5)", "3×3", "3×3 быстрый" }
local seed = 3032026
local profile: any = { coins = 0, pickaxe = "starter" }
Circle.initialize(profile)
local st = State.new(seed, profile.width, Config.mine.height)
local function shop(at: number, world: number)
	while true do
		local context = Circle.context(profile, world)
		local best, bestPrice = nil, math.huge
		for _, option in purchases do
			local quote = Upgrade.quote(context, option)
			if quote and quote.price <= context.coins and quote.price < bestPrice then
				best, bestPrice = option, quote.price
			end
		end
		if not best then
			return
		end
		local quote = assert(Circle.buy(profile, world, best))
		local level = quote.level
		if best.kind == "hitSize" then
			event(at, "удар " .. hitShape[level])
		elseif best.kind == "width" then
			assert(State.widen(st, level))
			event(at, "ширина " .. level)
		elseif best.kind == "pick" and level == 2 then
			event(
				at,
				"первый уровень улучшения кирки "
					.. Strings.t("pick_" .. profile.pickaxe, "ru")
			)
		elseif best.id then
			local morphs = Upgrade.morphs(best.id, level - 1, level)
			if level == 1 or #morphs > 0 then
				event(
					at,
					"карточка " .. Strings.t("card_" .. best.id, "ru") .. " ур. " .. level
				)
			end
		end
	end
end

local function target(): (number, number)
	local radius = (st.width - 1) // 2
	for y = 0, st.height - 1 do
		for x = -radius, radius do
			if State.isSolid(st, x, y, st.front) then
				return x, y
			end
		end
	end
	error("Empty front")
end

local started = os.clock()
print("| Время | Событие |")
print("|---|---|")
local t, pickIndex, charge, actions = 0, 1, 0, 0
local activeFraction = if style == "kid" then 0.6 else 1
while t < minutes * 60 and st.front <= Config.mine.maxDepth do
	while schedule[pickIndex] and schedule[pickIndex].at <= t do
		local change = schedule[pickIndex]
		profile.pickaxe = change.id
		event(change.at, "кирка: " .. Strings.t("pick_" .. change.id, "ru"))
		pickIndex += 1
	end
	local before = Worlds.of(st.front)
	shop(t, before.index)
	local pick = Circle.pick(profile.pickaxe, profile.circle, st.front)
	local cards = profile.circle.cards
	local result, multiplier
	if charge >= pick.ultCharge then
		result = Resolve.ult(st, pick)
		charge = 0
	else
		local x, y = target()
		profile.hitCounter += 1
		local strike =
			Power.strike(st.seed, profile.hitCounter, profile.critCounter, pick.strength, cards)
		profile.critCounter += if strike.crit then 1 else 0
		result = assert(Resolve.hit(st, pick, x, y, st.front, strike))
		multiplier = strike.coinMultiplier
		charge += 1
	end
	actions += 1
	profile.coins += Economy.coinsFor(result.hist, cards.coins, multiplier) + (result.plateReward or 0)
	State.advance(st)
	if result.plateBroken then
		profile.platesBroken += 1
		event(
			t,
			string.format(
				"Плита мира %d пробита · Сила %s · награда %s",
				before.index,
				Format.stat(pick.strength),
				Format.short(result.plateReward)
			)
		)
	end
	local after = Worlds.of(st.front)
	if after.index > before.index then
		Circle.reach(profile, after.index)
	end
	t += pick.interval / activeFraction
end

print(
	string.format(
		"\nИтог за %s · %s · глубина %s · мир %d · монеты %s · %d действий · зерно %d",
		clock(minutes * 60),
		style,
		Format.grouped(st.front),
		Worlds.of(st.front).index,
		Format.short(profile.coins),
		actions,
		seed
	)
)
print(string.format("Расчёт: %.3f с", os.clock() - started))
return true
