--!strict
-- Player-facing strings. Every new string goes here in all four locales (ru default).

local Config = require(script.Parent.Config)

type Entry = { [string]: string }

local STRINGS: { [string]: Entry } = {}
for _, part in ipairs({
	script.Part1,
	script.Part2,
	script.Part3,
	script.Part4,
	script.Part5,
	script.ReleaseCombat,
	script.ReleaseWorld,
	script.ReleaseItems,
	script.ReleaseUi,
	script.ReleaseServers,
	script.ReleaseTutorial,
	script.Commerce,
}) do
	for key, entry in pairs(require(part) :: any) do
		STRINGS[key] = entry
	end
end

local Strings = {}

local PICTURES = {
	["Качалка"] = "artifact_picture_gym",
	["Огород"] = "artifact_picture_garden",
	["Подручный"] = "artifact_picture_henchman",
	["Векна"] = "artifact_picture_vecna",
}

function Strings.artifactPictureName(name: string, locale: string?): string
	local key = PICTURES[name]
	return if key then Strings.t(key, locale) else name
end

-- «Локальный Бустер денег», «Global money booster» … (scope nil = local)
function Strings.boosterName(kind: string, scope: string?, locale: string?): string
	return Strings.t("booster_name_" .. kind .. "_" .. (scope or "local"), locale)
end

function Strings.localeOf(player: Player?): string
	if player then
		local locale = player:GetAttribute("Locale")
		if typeof(locale) == "string" and table.find(Config.locales, locale) then
			return locale
		end
	end
	return "en"
end

-- True when the key exists in that locale (tooltips skip lines that are not translated yet).
function Strings.has(key: string, locale: string?): boolean
	local entry = STRINGS[key]
	return entry ~= nil and entry[locale or Config.defaultLocale] ~= nil
end

function Strings.t(key: string, locale: string?, ...: any): string
	local entry = STRINGS[key]
	if not entry then
		return key
	end
	local text = entry[locale or Config.defaultLocale] or entry[Config.defaultLocale] or key
	if select("#", ...) > 0 then
		return string.format(text, ...)
	end
	return text
end

function Strings.bossName(id: string, fallbackName: string, locale: string?): string
	local key = "boss_name_" .. id
	return if Strings.has(key, locale) then Strings.t(key, locale) else fallbackName
end

-- Money for display: three decimals like the original ("0.012"), thousands as "9.91K".
local function trimZeros(text: string): string
	if string.find(text, ".", 1, true) then
		text = string.gsub(string.gsub(text, "0+$", ""), "%.$", "")
	end
	return text
end

function Strings.money(units: number): string
	local value = units / Config.moneyScale
	if value >= 100000 then
		return trimZeros(string.format("%.2f", value / 1000)) .. "K"
	elseif value >= 1000 then
		return trimZeros(string.format("%.1f", value / 1000)) .. "K"
	elseif value >= 100 then
		return string.format("%d", math.floor(value))
	end
	-- [владелец 08.11: «как человек накопит 3к, чтобы поднять уровень до 3?»] «3.000» read as three thousand: trailing
	-- zeros are dropped — 3 → «3», 5.5 → «5.5», 0.148 → «0.148»
	return trimZeros(string.format("%." .. tostring(Config.money.displayDecimals) .. "f", value))
end

-- 8507 → "8,507"; 599945.6 → "599,945.6" (up to decimals digits, trailing zeros dropped) — the original's tops
function Strings.grouped(n: number, decimals: number): string
	local scale = 10 ^ decimals
	local v = math.floor(n * scale + 0.5) / scale
	local whole = math.floor(v)
	local frac = v - whole
	local s = tostring(whole):reverse():gsub("(%d%d%d)", "%1,"):reverse()
	if s:sub(1, 1) == "," then
		s = s:sub(2)
	end
	if decimals > 0 and frac > 0 then
		local f = string.format("%." .. decimals .. "f", frac):sub(3):gsub("0+$", "")
		if f ~= "" then
			s ..= "." .. f
		end
	end
	return s
end

function Strings.big(n: number): string
	if n >= 1000000 then
		return string.format("%.2fM", n / 1000000)
	elseif n >= 1000 then
		return string.format("%.2fK", n / 1000)
	end
	return tostring(math.floor(n))
end

-- World signs, block names, upgrade counters and location names are Russian in the map/config
-- (the source of truth); these tables translate them for the other locales [владелец 21.10].
local WORLD: { [string]: { [string]: string } } = {
	["Спавн"] = { en = "Spawn", es = "Spawn", fr = "Spawn" },
	["Телепортатор"] = {
		en = "Teleporter",
		es = "Teletransportador",
		fr = "Téléporteur",
	},
	["Тренер"] = { en = "Trainer", es = "Entrenador", fr = "Entraîneur" },
	["Повар"] = { en = "Cook", es = "Cocinero", fr = "Cuisinier" },
	["Ежедневные награды"] = {
		en = "Daily rewards",
		es = "Recompensas diarias",
		fr = "Récompenses quotidiennes",
	},
	["Баня"] = { en = "Bathhouse", es = "Baños", fr = "Bains" },
	["Рынок"] = { en = "Market", es = "Mercado", fr = "Marché" },
	["Столовая"] = { en = "Canteen", es = "Comedor", fr = "Cantine" },
	["Спальня"] = { en = "Bedroom", es = "Dormitorio", fr = "Dortoir" },
	["Шахта"] = { en = "Mine", es = "Mina", fr = "Mine" },
	["Малая шахта"] = { en = "Small mine", es = "Mina pequeña", fr = "Petite mine" },
	["Тюрьма"] = { en = "Prison", es = "Prisión", fr = "Prison" },
	["Задания"] = { en = "Quests", es = "Misiones", fr = "Quêtes" },
	["Витрина"] = { en = "Showcase", es = "Vitrina", fr = "Vitrine" },
	-- the faction base (scripts/build-fraction-base.luau)
	["Славяне"] = { en = "Slavs", es = "Eslavos", fr = "Slaves" },
	["Афро"] = { en = "Afro", es = "Afro", fr = "Afro" },
	["Азиаты"] = { en = "Asians", es = "Asiáticos", fr = "Asiatiques" },
	["Латиносы"] = { en = "Latinos", es = "Latinos", fr = "Latinos" },
	["Шахта фракции"] = {
		en = "Faction mine",
		es = "Mina de la facción",
		fr = "Mine de faction",
	},
	["Босс Зомбарь"] = { en = "Boss Zombar", es = "Jefe Zombar", fr = "Boss Zombar" },
	["R.I.P."] = { en = "R.I.P.", es = "R.I.P.", fr = "R.I.P." },
	["Скупщик блоков"] = {
		en = "Block buyer",
		es = "Comprador de bloques",
		fr = "Acheteur de blocs",
	},
	["Продавец предметов"] = {
		en = "Item seller",
		es = "Vendedor de objetos",
		fr = "Vendeur d'objets",
	},
	["Продавец еды"] = {
		en = "Food seller",
		es = "Vendedor de comida",
		fr = "Vendeur de nourriture",
	},
	["Обменник звёзд"] = {
		en = "Star exchange",
		es = "Cambio de estrellas",
		fr = "Échange d'étoiles",
	},
	["Обменник осколков"] = {
		en = "Shard exchange",
		es = "Cambio de fragmentos",
		fr = "Échange d'éclats",
	},
	["Охранник"] = { en = "Guard", es = "Guardia", fr = "Gardien" },
	["Обычный кейс"] = {
		en = "Ordinary case",
		es = "Caja común",
		fr = "Caisse ordinaire",
	},
	["Древний кейс"] = {
		en = "Ancient case",
		es = "Caja antigua",
		fr = "Caisse antique",
	},
	["Кейс артефактов"] = {
		en = "Artifact case",
		es = "Caja de artefactos",
		fr = "Caisse d'artefacts",
	},
	["Кейс с кличками"] = {
		en = "Nickname case",
		es = "Caja de apodos",
		fr = "Caisse des surnoms",
	},
	["Эндер-сундук"] = {
		en = "Ender chest",
		es = "Cofre de Ender",
		fr = "Coffre de l'Ender",
	},
	-- the Хранилище building (scripts/build-vault.luau): the hologram and the chest sign
	["ХРАНИЛИЩЕ"] = { en = "VAULT", es = "ALMACÉN", fr = "COFFRE-FORT" },
	["Хранилище"] = { en = "Vault", es = "Almacén", fr = "Coffre-fort" },
	["3 отсека по 27 слотов"] = {
		en = "3 sections of 27 slots",
		es = "3 secciones de 27 espacios",
		fr = "3 sections de 27 emplacements",
	},
	["Проводник: продать"] = {
		en = "Buyer: sell",
		es = "Comprador: vender",
		fr = "Acheteur : vendre",
	},
	["Зачарованная: "] = {
		en = "Enchanted: ",
		es = "Encantada: ",
		fr = "Enchantée : ",
	},
	["Ножницы"] = { en = "Shears", es = "Tijeras", fr = "Cisailles" },
}
local BLOCKS: { [string]: { [string]: string } } = {
	["sand"] = { en = "Sand", es = "Arena", fr = "Sable" },
	["gravel"] = { en = "Gravel", es = "Grava", fr = "Gravier" },
	["dirt"] = { en = "Dirt", es = "Tierra", fr = "Terre" },
	["oak_log"] = { en = "Oak log", es = "Tronco de roble", fr = "Bûche de chêne" },
	["melon"] = { en = "Melon", es = "Sandía", fr = "Pastèque" },
	["melon_slice"] = { en = "Melon slice", es = "Rodaja de sandía", fr = "Tranche de pastèque" },
	["cobblestone"] = { en = "Cobblestone", es = "Piedra labrada", fr = "Pierre taillée" },
	["stone"] = { en = "Stone", es = "Piedra", fr = "Pierre" },
	["coal"] = { en = "Coal", es = "Carbón", fr = "Charbon" },
	["coal_ore"] = { en = "Coal ore", es = "Mena de carbón", fr = "Minerai de charbon" },
	["iron_ore"] = { en = "Iron ore", es = "Mena de hierro", fr = "Minerai de fer" },
	["coal_block"] = { en = "Coal block", es = "Bloque de carbón", fr = "Bloc de charbon" },
	["red_sand"] = { en = "Red sand", es = "Arena roja", fr = "Sable rouge" },
	["gold_ore"] = { en = "Gold ore", es = "Mena de oro", fr = "Minerai d'or" },
	["netherite"] = { en = "Netherite", es = "Netherita", fr = "Netherite" },
	["soul_sand"] = { en = "Soul sand", es = "Arena de almas", fr = "Sable des âmes" },
	["quartz"] = { en = "Nether quartz", es = "Cuarzo del Nether", fr = "Quartz du Nether" },
	["quartz_ore"] = {
		en = "Nether quartz ore",
		es = "Mena de cuarzo del Nether",
		fr = "Minerai de quartz du Nether",
	},
	["sandstone"] = { en = "Sandstone", es = "Arenisca", fr = "Grès" },
	["red_sandstone"] = { en = "Red sandstone", es = "Arenisca roja", fr = "Grès rouge" },
	["wisteria_leaves"] = {
		en = "Pink wisteria leaves",
		es = "Hojas de glicinia rosa",
		fr = "Feuilles de glycine rose",
	},
	["cherry_log"] = { en = "Cherry log", es = "Tronco de cerezo", fr = "Bûche de cerisier" },
	["cyan_concrete"] = { en = "Cyan concrete", es = "Hormigón cian", fr = "Béton cyan" },
	["prismarine"] = { en = "Prismarine", es = "Prismarina", fr = "Prismarine" },
	["prismarine_bricks"] = {
		en = "Prismarine bricks",
		es = "Ladrillos de prismarina",
		fr = "Briques de prismarine",
	},
	["end_stone_bricks"] = {
		en = "End stone bricks",
		es = "Ladrillos de piedra del End",
		fr = "Briques de pierre de l'End",
	},
	["purpur"] = { en = "Purpur", es = "Purpur", fr = "Purpur" },
	["white_wool"] = { en = "White wool", es = "Lana blanca", fr = "Laine blanche" },
	["cobweb"] = { en = "Cobweb", es = "Telaraña", fr = "Toile d'araignée" },
	["ice"] = { en = "Ice", es = "Hielo", fr = "Glace" },
	["packed_ice"] = { en = "Packed ice", es = "Hielo compacto", fr = "Glace compactée" },
	["yellow_wool"] = { en = "Yellow wool", es = "Lana amarilla", fr = "Laine jaune" },
	["red_wool"] = { en = "Red wool", es = "Lana roja", fr = "Laine rouge" },
	["lime_wool"] = { en = "Lime wool", es = "Lana verde lima", fr = "Laine vert clair" },
	["orange_concrete"] = { en = "Orange concrete", es = "Hormigón naranja", fr = "Béton orange" },
	["yellow_concrete"] = { en = "Yellow concrete", es = "Hormigón amarillo", fr = "Béton jaune" },
	["lime_concrete"] = {
		en = "Lime concrete",
		es = "Hormigón verde lima",
		fr = "Béton vert clair",
	},
	["purple_concrete"] = { en = "Purple concrete", es = "Hormigón morado", fr = "Béton violet" },
	["red_concrete"] = { en = "Red concrete", es = "Hormigón rojo", fr = "Béton rouge" },
	["quartz_block"] = { en = "Quartz block", es = "Bloque de cuarzo", fr = "Bloc de quartz" },
	["chiseled_quartz"] = {
		en = "Chiseled quartz block",
		es = "Bloque de cuarzo cincelado",
		fr = "Bloc de quartz sculpté",
	},
	["dark_oak_leaves"] = {
		en = "Dark oak leaves",
		es = "Hojas de roble oscuro",
		fr = "Feuilles de chêne noir",
	},
	["pink_wool"] = { en = "Pink wool", es = "Lana rosa", fr = "Laine rose" },
	["sea_lantern"] = { en = "Sea lantern", es = "Linterna marina", fr = "Lanterne aquatique" },
	["pumpkin"] = { en = "Pumpkin", es = "Calabaza", fr = "Citrouille" },
	["green_wool"] = { en = "Green wool", es = "Lana verde", fr = "Laine verte" },
	["jack_o_lantern"] = {
		en = "Jack o'lantern",
		es = "Calabaza iluminada",
		fr = "Citrouille-lanterne",
	},
	["magenta_concrete"] = {
		en = "Magenta concrete",
		es = "Hormigón magenta",
		fr = "Béton magenta",
	},
	["black_glass"] = { en = "Black glass", es = "Vidrio negro", fr = "Verre noir" },
	["white_concrete"] = { en = "White concrete", es = "Hormigón blanco", fr = "Béton blanc" },
	["clay"] = { en = "Clay", es = "Arcilla", fr = "Argile" },
	["chiseled_sandstone"] = {
		en = "Chiseled sandstone",
		es = "Arenisca cincelada",
		fr = "Grès sculpté",
	},
	["brown_mushroom_block"] = {
		en = "Brown mushroom block",
		es = "Bloque de champiñón marrón",
		fr = "Bloc de champignon brun",
	},
	["snow"] = { en = "Snow", es = "Nieve", fr = "Neige" },
	["smooth_sandstone"] = { en = "Smooth sandstone", es = "Arenisca lisa", fr = "Grès lisse" },
	["red_mushroom_block"] = {
		en = "Red mushroom block",
		es = "Bloque de champiñón rojo",
		fr = "Bloc de champignon rouge",
	},
	["lapis_block"] = {
		en = "Lapis lazuli block",
		es = "Bloque de lapislázuli",
		fr = "Bloc de lapis-lazuli",
	},
	["iron_block"] = { en = "Iron block", es = "Bloque de hierro", fr = "Bloc de fer" },
	["gold_block"] = { en = "Gold block", es = "Bloque de oro", fr = "Bloc d'or" },
	["diamond_block"] = { en = "Diamond block", es = "Bloque de diamante", fr = "Bloc de diamant" },
}
local COUNTERS: { [string]: { [string]: string } } = {
	["Камень"] = { en = "Stone", es = "Piedra", fr = "Pierre" },
	["Каменный уголь"] = {
		en = "Coal ore",
		es = "Mena de carbón",
		fr = "Minerai de charbon",
	},
	["Железная руда"] = {
		en = "Iron ore",
		es = "Mena de hierro",
		fr = "Minerai de fer",
	},
	["Золотая руда"] = { en = "Gold ore", es = "Mena de oro", fr = "Minerai d'or" },
	["Гравий"] = { en = "Gravel", es = "Grava", fr = "Gravier" },
	["Песок"] = { en = "Sand", es = "Arena", fr = "Sable" },
	["Земля"] = { en = "Dirt", es = "Tierra", fr = "Terre" },
	["Крысы"] = { en = "Rats", es = "Ratas", fr = "Rats" },
	["Оружейник"] = { en = "Armorer", es = "Armero", fr = "Armurier" },
	["Дерево"] = { en = "Wood", es = "Madera", fr = "Bois" },
	["Арбуз"] = { en = "Melon", es = "Sandía", fr = "Pastèque" },
	["Белая шерсть"] = { en = "White wool", es = "Lana blanca", fr = "Laine blanche" },
	["Паутина"] = { en = "Cobweb", es = "Telaraña", fr = "Toile d'araignée" },
	["Убийства"] = { en = "Kills", es = "Bajas", fr = "Éliminations" },
}
local LOCATIONS: { [string]: { [string]: string } } = {
	["Тюрьма"] = { en = "Prison", es = "Prisión", fr = "Prison" },
	["Начальная локация"] = {
		en = "Starting location",
		es = "Zona inicial",
		fr = "Zone de départ",
	},
	["Каменоломня"] = { en = "Quarry", es = "Cantera", fr = "Carrière" },
	["Подножье горы"] = {
		en = "Mountain foot",
		es = "Pie de la montaña",
		fr = "Pied de la montagne",
	},
	["Преисподняя"] = { en = "Underworld", es = "Inframundo", fr = "Enfers" },
	["Пирамида"] = { en = "Pyramid", es = "Pirámide", fr = "Pyramide" },
	["Королевский сад"] = {
		en = "Royal garden",
		es = "Jardín real",
		fr = "Jardin royal",
	},
	["Затопленный маяк"] = {
		en = "Sunken lighthouse",
		es = "Faro hundido",
		fr = "Phare englouti",
	},
	["Пустотная крепость"] = {
		en = "Void fortress",
		es = "Fortaleza del vacío",
		fr = "Forteresse du vide",
	},
	["Паучье логово"] = {
		en = "Spider lair",
		es = "Guarida de arañas",
		fr = "Antre des araignées",
	},
	["Снежная даль"] = {
		en = "Snowy reach",
		es = "Lejanía nevada",
		fr = "Lointain enneigé",
	},
	["Снежная длань"] = {
		en = "Snowy hand",
		es = "Mano nevada",
		fr = "Main enneigée",
	},
	["Снежная далнь"] = {
		en = "Snowy reach",
		es = "Lejanía nevada",
		fr = "Lointain enneigé",
	},
	["Рынок"] = { en = "Market", es = "Mercado", fr = "Marché" },
	["Лепреконовая долина"] = {
		en = "Leprechaun valley",
		es = "Valle del duende",
		fr = "Vallée des leprechauns",
	},
	["Замок"] = { en = "Castle", es = "Castillo", fr = "Château" },
	["Изнанка"] = { en = "The Other Side", es = "El reverso", fr = "L'Envers" },
	["Киото"] = { en = "Kyoto", es = "Kioto", fr = "Kyoto" },
	["Ферма"] = { en = "Farm", es = "Granja", fr = "Ferme" },
	["Амбар"] = { en = "Barn", es = "Granero", fr = "Grange" },
	["Врата края"] = { en = "End gate", es = "Puerta del Fin", fr = "Porte de l'End" },
	["Древо"] = { en = "The Tree", es = "El Árbol", fr = "L'Arbre" },
	["Церковь"] = { en = "Church", es = "Iglesia", fr = "Église" },
	["Чистилище"] = { en = "Purgatory", es = "Purgatorio", fr = "Purgatoire" },
	["Эдем"] = { en = "Eden", es = "Edén", fr = "Éden" },
	["Херувимы"] = { en = "Cherubim", es = "Querubines", fr = "Chérubins" },
	["Врата"] = { en = "Gates", es = "Puertas", fr = "Portes" },
	["Рай"] = { en = "Paradise", es = "Paraíso", fr = "Paradis" },
	["Подвал"] = { en = "Basement", es = "Sótano", fr = "Sous-sol" },
	["База фракций"] = {
		en = "Faction base",
		es = "Base de facciones",
		fr = "Base des factions",
	},
	["Дворы"] = { en = "Yards", es = "Patios", fr = "Cours" },
	["Гетто"] = { en = "Ghetto", es = "Gueto", fr = "Ghetto" },
	["База банды"] = { en = "Gang base", es = "Base de la banda", fr = "Base du gang" },
	["Личная камера"] = {
		en = "Private cell",
		es = "Celda privada",
		fr = "Cellule privée",
	},
	["Мертвозавод"] = { en = "Dead factory", es = "Fábrica muerta", fr = "Usine morte" },
	["Карьеры"] = { en = "Quarries", es = "Canteras", fr = "Carrières" },
}

local function pick(table_: { [string]: { [string]: string } }, ru: string, locale: string?): string
	local loc = locale or Config.defaultLocale
	if loc == "ru" then
		return ru
	end
	local row = table_[ru]
	return if row and row[loc] then row[loc] else ru
end

-- World labels reuse the same names as their menus; additional map text lives in string parts.
for ru, key in pairs({
	["Библиотекарь"] = "gang_library_title",
	["Кузнец"] = "gang_forge_title",
	["Чёрный рынок"] = "exchange_black",
	["Торговец"] = "exchange_trader",
	["Каменщик"] = "job_mason",
	["Барыга"] = "book_trader",
	["Арена босса"] = "spot_boss",
}) do
	WORLD[ru] = STRINGS[key]
end
for key, entry in pairs(STRINGS) do
	if key:sub(1, 6) == "world_" then
		WORLD[entry.ru] = entry
	end
end

local function worldUpper(text: string): string
	local out = {}
	for _, code in utf8.codes(text) do
		if
			(code >= 0x0430 and code <= 0x044F)
			or (code >= 97 and code <= 122)
			or (code >= 0x00E0 and code <= 0x00F6)
			or (code >= 0x00F8 and code <= 0x00FE)
		then
			code -= 32
		elseif code == 0x0451 then
			code = 0x0401
		elseif code == 0x00FF then
			code = 0x0178
		elseif code == 0x0153 then
			code = 0x0152
		end
		table.insert(out, utf8.char(code))
	end
	return table.concat(out)
end

-- Text of a world sign (BillboardGui / SurfaceGui label built in Russian). Keeps upper case.
function Strings.worldText(ru: string, locale: string?): string
	local loc = locale or Config.defaultLocale
	if loc == "ru" then
		return ru
	end
	local upper = ru == worldUpper(ru) and ru ~= Strings.lower(ru)
	local row = WORLD[ru] or LOCATIONS[ru]
	if not row and upper then
		for _, dictionary in ipairs({ WORLD, LOCATIONS }) do
			for candidate, entry in pairs(dictionary) do
				if worldUpper(candidate) == ru then
					row = entry
					break
				end
			end
			if row then
				break
			end
		end
	end
	if not row or not row[loc] then
		return ru
	end
	return if upper then worldUpper(row[loc]) else row[loc]
end

function Strings.blockName(id: string, ruName: string, locale: string?): string
	local loc = locale or Config.defaultLocale
	if loc == "ru" then
		return ruName
	end
	local row = BLOCKS[id]
	if row and row[loc] then
		return row[loc]
	end
	-- Item-only catalog entries (e.g. a gang mine pass) use the item-name translations.
	local key = "item_" .. id
	return if Strings.has(key, loc) then Strings.t(key, loc) else ruName
end

function Strings.counterName(ru: string, locale: string?): string
	return pick(COUNTERS, ru, locale)
end

function Strings.locationName(ru: string, locale: string?): string
	return pick(LOCATIONS, ru, locale)
end

-- string.lower only handles ASCII; Cyrillic capitals (А–Я, Ё) need their own mapping.
local function utf8lower(text: string): string
	local out = {}
	for _, code in utf8.codes(text) do
		if code >= 0x0410 and code <= 0x042F then
			code += 0x20
		elseif code == 0x0401 then
			code = 0x0451
		elseif code >= 65 and code <= 90 then
			code += 32
		end
		table.insert(out, utf8.char(code))
	end
	return table.concat(out)
end
Strings.lower = utf8lower -- Latin + Cyrillic (the auction search)

function Strings.itemName(id: string, level: number?, locale: string?): string
	local loc = locale or Config.defaultLocale
	local block = Config.block(id)
	if block then
		return Strings.blockName(id, block.name, loc)
	end
	-- a donate booster taken out as an item: «Локальный бустер денег» (Boosters.itemId)
	local kind, scope = id:match("^booster_(%a+)_(%a+)$")
	if
		kind
		and scope
		and Strings.has("donate_kind_" .. kind)
		and Strings.has("booster_scope_" .. scope)
	then
		return Strings.t(
			"donate_booster_name",
			loc,
			Strings.t("booster_scope_" .. scope, loc),
			Strings.t("donate_kind_" .. kind, loc)
		) .. " ×2"
	end
	local key = "item_" .. id
	local base = Strings.t(key, loc)
	if id == "ancient_book" and level then
		return base .. " " .. tostring(level)
	end
	if Config.tools[id] and level and not Config.tools[id].noMaterial then
		local material = Strings.t("mat_" .. Config.materialForLevel(level), loc)
		if loc == "es" or loc == "fr" then
			return base .. " " .. utf8lower(material) -- "Pala de madera", "Pelle en bois"
		end
		return material .. " " .. utf8lower(base)
	end
	return base
end

-- Full tool/armor names for tooltips, as Minecraft says them in each language: armor tiers are
-- leather / chainmail / iron / diamond; Russian adjectives agree with the noun's gender; Spanish and
-- French put the material after the noun. Other items: same as itemName.
local ARMOR_PIECES = { helmet = true, chestplate = true, leggings = true, boots = true }
local RU_GENDER: { [string]: string } = {
	pickaxe = "f",
	shovel = "f",
	axe = "m",
	sword = "m",
	helmet = "m",
	chestplate = "m",
	leggings = "p",
	boots = "p",
}
local RU_STEMS = {
	tool = {
		wood = "Деревянн",
		stone = "Каменн",
		iron = "Железн",
		diamond = "Алмазн",
	},
	armor = {
		wood = "Кожан",
		stone = "Кольчужн",
		iron = "Железн",
		diamond = "Алмазн",
	},
}
local RU_ENDINGS = { f = "ая", m = "ый", p = "ые" }
local MATERIAL_WORDS: { [string]: { tool: { [string]: string }, armor: { [string]: string } } } = {
	en = {
		tool = { wood = "Wooden", stone = "Stone", iron = "Iron", diamond = "Diamond" },
		armor = { wood = "Leather", stone = "Chainmail", iron = "Iron", diamond = "Diamond" },
	},
	es = {
		tool = {
			wood = "de madera",
			stone = "de piedra",
			iron = "de hierro",
			diamond = "de diamante",
		},
		armor = {
			wood = "de cuero",
			stone = "de malla",
			iron = "de hierro",
			diamond = "de diamante",
		},
	},
	fr = {
		tool = { wood = "en bois", stone = "en pierre", iron = "en fer", diamond = "en diamant" },
		armor = { wood = "en cuir", stone = "en mailles", iron = "en fer", diamond = "en diamant" },
	},
}
function Strings.itemFullName(id: string, level: number?, locale: string?): string
	local loc = locale or Config.defaultLocale
	if not (Config.tools[id] and level) or Config.tools[id].noMaterial then
		return Strings.itemName(id, level, loc)
	end
	local material = Config.materialForLevel(level :: number)
	local kind = if ARMOR_PIECES[id] then "armor" else "tool"
	local noun = Strings.t("item_" .. id, loc)
	if loc == "ru" then
		local ending = RU_ENDINGS[RU_GENDER[id] or "m"]
		return RU_STEMS[kind][material] .. ending .. " " .. utf8lower(noun)
	end
	local words = MATERIAL_WORDS[loc] or MATERIAL_WORDS.en
	local word = words[kind][material]
	if loc == "es" or loc == "fr" then
		return noun .. " " .. word
	end
	return word .. " " .. utf8lower(noun)
end

return Strings
