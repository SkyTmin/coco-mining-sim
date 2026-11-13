--!strict
-- Executes the production mining transaction; scheduled grants and initial skills are explicit QA inputs.
local process = require("@lune/process")
local Loader = require("../../tests/lib/loader")
local Config = Loader.load("src/shared/Config")
local State = Loader.load("src/shared/Mine/MineState.luau")
local Worlds = Loader.load("src/shared/Mine/Worlds.luau")
local Circle = Loader.load("src/shared/Play/Circle.luau")
local Defaults = Loader.load("src/shared/Play/ProfileDefaults.luau")
local Rebirth = Loader.load("src/shared/Play/Rebirth.luau")
local Income = Loader.load("src/shared/Play/Income.luau")
local Streak = Loader.load("src/shared/Play/Streak.luau")
local Pace = Loader.load("src/shared/Play/Pace.luau")
local Events = Loader.load("src/shared/Play/MineEvents.luau")
local Hash = Loader.load("src/shared/Mine/Hash.luau")
local Family = Loader.load("src/shared/Play/Family.luau")
local Collection = Loader.load("src/shared/Play/Collection.luau")
local Chest = Loader.load("src/shared/Play/Chest.luau")
local Perks = Loader.load("src/shared/Play/Perks.luau")
local Action = Loader.load("src/shared/Play/MiningAction.luau")
local WallChests = Loader.load("src/shared/Play/WallChests.luau")
local Upgrade = Loader.load("src/shared/Play/Upgrade.luau")
local Ride = Loader.load("src/shared/Mine/Ride.luau")
local Format = Loader.load("src/shared/Format.luau")
local Strings = Loader.load("src/shared/Strings")

local usage =
	"lune run scripts/sim/run.luau -- [minutes] [active|kid] [--picks=3:45:storm_common,15:00:storm_rare] [--skills=0,0,0,0]"
local args = table.clone(process.args)
if args[1] == "--" then
	table.remove(args, 1)
end
local minutes, style = tonumber(args[1] or "60"), args[2] or "active"
assert(minutes and minutes > 0 and minutes < math.huge and #args <= 4, usage)
assert(style == "active" or style == "kid", usage)
local schedule = {}
if args[3] then
	local changes = assert(args[3]:match("^%-%-picks=(.+)$"), usage)
	for change in changes:gmatch("[^,]+") do
		local m, s, id = change:match("^(%d+):(%d%d):([%a][%w_]*)$")
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
local initialSkills = { 0, 0, 0, 0 }
if args[4] then
	local levels = assert(args[4]:match("^%-%-skills=(.+)$"), usage)
	local index = 0
	for value in levels:gmatch("[^,]+") do
		local level = tonumber(value)
		assert(level and level % 1 == 0 and level >= 0 and level <= 10, usage)
		index += 1
		initialSkills[index] = level
	end
	assert(index == 4, usage)
end
local function clock(seconds: number): string
	return string.format("%d:%02d", seconds // 60, seconds % 60 // 1)
end
local function event(at: number, text: string)
	print("| " .. clock(at) .. " | " .. text .. " |")
end
local purchases = { { kind = "width", count = 1 }, { kind = "pick", count = 1 } }
for _, id in Upgrade.cards do
	table.insert(purchases, { kind = "card", id = id, count = 1 })
end
local seed = 3032026
local profile = Defaults.new(0)
local st, runtime = State.new(seed, profile.width, Config.mine.height), Perks.new()
local randomIndex = 0
local function random(): number
	randomIndex += 1
	return Hash.unit(seed, randomIndex)
end
local streak, pace, marks = Streak.new(0), Pace.new(), Events.new(0, random)
local frozenUntil = 0
local counts = { vein = 0, caught = 0, bomb = 0, defused = 0, fizzle = 0, fever = 0 }
local firstAvailable, firstRebirth = nil, nil
local function eventResults(results: { any }, at: number)
	for _, result in results do
		if result.type == 1 then
			profile.staged.firstVein = true
			counts.vein += 1
			if counts.vein == 1 then
				event(at, "первая Золотая жила")
			end
		elseif result.type == 2 and result.reason == 1 then
			counts.caught += 1
		elseif result.type == 3 then
			counts.fever += 1
		elseif result.type == 5 then
			counts.bomb += 1
		elseif result.type == 6 then
			counts.fizzle += 1
		end
	end
end
local function shop(at: number, world: number)
	while true do
		local ctx = Circle.context(profile, world)
		local best, price = nil, math.huge
		for _, option in purchases do
			local quote = Upgrade.quote(ctx, option)
			if quote and quote.price <= ctx.coins and quote.price < price then
				best, price = option, quote.price
			end
		end
		if not best then
			break
		end
		local quote = assert(Circle.buy(profile, world, best))
		if best.kind == "width" then
			State.widen(st, quote.level)
			event(at, "ширина " .. quote.level)
		elseif best.kind == "pick" and quote.level == 2 then
			event(at, "первый уровень кирки")
		elseif
			best.id
			and (quote.level == 1 or #Upgrade.morphs(best.id, quote.level - 1, quote.level) > 0)
		then
			event(
				at,
				"карточка "
					.. Strings.t("card_" .. best.id, "ru")
					.. " ур. "
					.. quote.level
			)
		end
	end
end
local function target(): (number, number, number)
	-- An attentive player prioritizes the current event; no scripted event outcomes.
	local marked = if marks.bomb
		then marks.bomb.cell
		elseif marks.vein then marks.vein.cells[1]
		else nil
	if marked and State.isExposed(st, marked.x, marked.y, marked.d) then
		return marked.x, marked.y, marked.d
	end
	for y = 0, st.height - 1 do
		for x = -(st.width - 1) // 2, (st.width - 1) // 2 do
			if State.isSolid(st, x, y, st.front) then
				return x, y, st.front
			end
		end
	end
	error("Empty front")
end
local started, t, pickIndex, charge, actions, extra = os.clock(), 0, 1, 0, 0, 0
local activeFraction = if style == "kid" then 0.6 else 1
print("| Время | Событие |\n|---|---|")
while t < minutes * 60 and st.front <= Config.mine.maxDepth do
	while schedule[pickIndex] and schedule[pickIndex].at <= t do
		local change = schedule[pickIndex]
		Collection.grant(profile, change.id)
		local family = Config.pickaxes[change.id].family
		profile.family, profile.pickaxe, profile.pickaxeGolden = family, change.id, false
		if family then
			profile.skills[family] = table.clone(initialSkills)
		end
		runtime = Perks.new()
		event(
			t,
			"постановочная кирка: "
				.. (if family
					then Strings.t("family_" .. family, "ru")
					else Strings.t("pick_starter", "ru"))
				.. " "
				.. change.id
		)
		pickIndex += 1
	end
	profile.stats.playSeconds = t
	eventResults(
		Events.tick(marks, st, t, t, profile.staged.firstVein == true, t < frozenUntil, random),
		t
	)
	local current = Worlds.of(st.front)
	local quote = Rebirth.quote(
		profile,
		Pace.eta(
			pace,
			st.front,
			current.plateDepth,
			current.index == #Config.worlds and st.front >= current.plateDepth
		)
	)
	if quote.available and not firstAvailable then
		firstAvailable = t
		event(t, "первое перерождение доступно · gain " .. quote.gain)
	end
	if quote.profitable then
		-- Stop digging, wait out the ride and hold the confirmation button.
		t = math.max(t, frozenUntil) + Config.rebirth.holdSeconds
		profile.stats.playSeconds = t
		local choice = {
			serial = quote.serial,
			gain = quote.gain,
			family = quote.family,
			start = quote.start,
			playSeconds = t,
		}
		local nextSeed = st.seed % Config.rebirth.seedMax + 1
		local plan, failure = Rebirth.plan(profile, choice, nextSeed, Worlds.at(quote.start).start)
		assert(plan, failure)
		Rebirth.commit(profile, plan)
		st, runtime, streak, pace, marks =
			plan.state, Perks.new(), Streak.new(t), Pace.new(), Events.new(t, random)
		charge, frozenUntil = 0, 0
		marks.giftAt = t + Config.rebirth.giftStartSeconds
		firstRebirth = firstRebirth or t
		event(
			t,
			string.format(
				"ПЕРЕРОЖДЕНИЕ №%d · +%d Кубков → %d · старт %d · семья %s",
				profile.rebirths,
				quote.gain,
				profile.cups,
				quote.start,
				quote.family
			)
		)
		if profile.rewards.masterEpic == "pending" then
			Collection.grant(profile, (profile.family or Config.familyRules.order[1]) .. "_epic")
			profile.rewards.masterEpic = "claimed"
		end
		t += Config.rebirth.transitionSeconds
		continue
	end
	WallChests.stage(st, profile, t, marks)
	local before = Worlds.of(st.front)
	shop(t, before.index)
	local pick = Circle.pick(profile.pickaxe, profile.circle, st.front, profile)
	local ability = charge >= pick.ultCharge
	local x, y, d = target()
	Streak.decay(streak, math.min(t, frozenUntil), true)
	Streak.decay(streak, t, false)
	local feverUntil = if marks.giftAt and not ability
		then t + Config.events.fever.giftSeconds
		else marks.feverUntil
	local income = Income.context(
		profile,
		Family.effects(profile),
		{ Streak.multiplier(streak) },
		t,
		feverUntil
	)
	local cost = 0
	for wave = 1, 2 do
		local outcome = assert(Action.perform(st, profile, runtime, {
			ability = ability,
			now = t,
			serverNow = t,
			playSeconds = t,
			x = x,
			y = y,
			d = d,
			echo = wave == 2,
			marks = marks,
			income = income,
		}))
		actions += 1
		eventResults(
			Events.after(marks, st, {
				now = t,
				ability = ability,
				x = x,
				y = y,
				d = d,
				feverActive = income.F == Config.events.fever.multiplier,
			}, outcome.coins),
			t
		)
		if outcome.blast then
			counts.defused += 1
		end
		if not ability then
			Streak.add(streak, t, pick.interval, "hand")
		end
		Pace.record(pace, t, outcome.delta)
		for _, cell in outcome.res.cells do
			if cell.gen == 1 then
				extra += 1
			end
		end
		if ability or outcome.delta > 0 then
			cost += if ability then outcome.duration else Ride.timeline(outcome.delta, false).total
			frozenUntil = t + cost
		end
		if outcome.res.plateBroken then
			event(
				t,
				"Плита мира "
					.. outcome.oldWorld
					.. " пробита · Сила "
					.. Format.stat(pick.strength)
			)
		end
		if not outcome.echo then
			break
		end
	end
	charge = if ability then 0 else charge + 1
	while profile.keys > 0 do
		Chest.open(profile, seed)
	end
	if profile.family then
		local best, golden = Family.best(profile, profile.family)
		if best then
			Collection.equip(profile, best, golden)
		end
	end
	t += if ability then cost else pick.interval / activeFraction
end
print(
	string.format(
		"Итог за %s · %s · глубина %s · мир %d · монеты %s · %d действий · зерно %d",
		clock(minutes * 60),
		style,
		Format.grouped(st.front),
		Worlds.of(st.front).index,
		Format.short(profile.coins),
		actions,
		seed
	)
)
print(
	string.format(
		"Фишки: %d блоков · сундуков стены %d · ключей выдано %d · Сундуков кирок %d · общий бонус монет %.2f",
		extra,
		profile.wallChestsOpened,
		profile.pickChestsOpened + profile.keys,
		profile.pickChestsOpened,
		Family.coinBonus(profile)
	)
)
print(string.format("Расчёт: %.3f с", os.clock() - started))
print(
	string.format(
		"Циклы: первое доступно %s · первое выполнено %s · перерождений %d · Кубков %d",
		if firstAvailable then clock(firstAvailable) else "нет",
		if firstRebirth then clock(firstRebirth) else "нет",
		profile.rebirths,
		profile.cups
	)
)
print(
	string.format(
		"События: жил %d / поймано %d · бомб %d / обезврежено %d / пшик %d · Лихорадок %d",
		counts.vein,
		counts.caught,
		counts.bomb,
		counts.defused,
		counts.fizzle,
		counts.fever
	)
)
return true
