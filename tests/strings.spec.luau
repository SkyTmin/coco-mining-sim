--!strict

local fs = require("@lune/fs")
local Test = require("./lib/expect")
local Loader = require("./lib/loader")
local Strings = Loader.load("src/shared/Strings")
local expect = Test.expect

local LOCALES = { "en", "ru", "es", "fr" }
local DIRECTORY = "src/shared/Strings/"

local function placeholders(text: string): { [string]: number }
	local found = {}
	for index in text:gmatch("{(%d+)}") do
		found[index] = (found[index] or 0) + 1
	end
	return found
end

Test.describe("Strings", function()
	for _, part in fs.readDir(DIRECTORY) do
		if part == "init.luau" or not part:match("%.luau$") then
			continue
		end
		Test.it(part .. " has all locales and matching placeholders", function()
			local path = DIRECTORY .. part
			local length = utf8.len(fs.readFile(path))
			assert(length and length <= 150000, part .. " exceeds the module size limit")
			for key, entry in Loader.load(path) do
				assert(typeof(entry.en) == "string", key .. " is missing en")
				local expected = placeholders(entry.en)
				for _, language in LOCALES do
					local text = entry[language]
					assert(
						typeof(text) == "string" and text:match("%S"),
						key .. " is empty in " .. language
					)
					expect(placeholders(text)).toEqual(expected)
				end
			end
		end)
	end
	Test.it("loads stage keys and falls back to English and then the key", function()
		for _, key in
			{
				"loading_title",
				"loading_tip_1",
				"loading_tip_2",
				"loading_tip_3",
				"toast_saved",
				"toast_load_failed",
				"creative_on",
				"creative_off",
				"creative_title",
				"mine_settings",
				"mine_plate_remaining",
				"mine_ult_layers",
			}
		do
			expect(Strings.has(key)).toBe(true)
		end
		expect(Strings.has("loading_title", "zz")).toBe(false)
		expect(Strings.t("loading_title", "zz")).toBe(Strings.t("loading_title", "en"))
		expect(Strings.t("unknown_key")).toBe("unknown_key")
	end)
	Test.it("uses the specified Russian names in progress UI", function()
		local locale = "ru"
		expect(Strings.t("mine_world_enter", locale, 2, Strings.t("world_copper_caves", locale))).toBe(
			"Мир 2 · Медные пещеры"
		)
		expect(Strings.t("upgrade_title", locale)).toBe("Улучшения")
		expect(Strings.t("upgrade_stronger", locale)).toBe("Стань сильнее")
		expect(Strings.t("morph_toast_power_10", locale)).toBe(
			"Сила стала другой: Тяжёлый удар"
		)
		expect(Strings.t("upgrade_price", locale, 100)).toBe("100 мон.")
	end)
	Test.it("substitutes arguments and keeps buttons within twelve characters", function()
		expect(Strings.t("creative_coins", "es", 100)).toBe("+100 monedas")
		expect(Strings.t("mine_ult_value", "ru", 87, 232)).toBe(
			"Блоки −87 · Монеты +232"
		)
		for _, key in
			{
				"creative_title",
				"creative_on",
				"creative_off",
				"creative_coins",
				"creative_reset",
				"collection_tab",
				"family_tab",
				"family_change",
				"family_tomorrow",
				"family_current",
				"pick_take",
				"pick_gold",
				"pick_merge",
				"pick_buy",
				"pick_grant",
				"pick_chest_open",
				"creative_keys",
				"creative_collection_reset",
				"creative_chests_100",
				"creative_first_storm",
				"creative_first_key",
			}
		do
			for _, language in LOCALES do
				local length = utf8.len(Strings.t(key, language, 100))
				assert(length and length <= 12, key .. " is too long in " .. language)
			end
		end
	end)
end)

return true
