--!strict

local Config = require(script.Parent.Config)
local defaultLanguage = Config.game.defaultLanguage

type Entry = { [string]: string }
local catalog: { [string]: Entry } = {}
for _, part in { script.Core, script.Mine, script.MineSlice, script.MineFeel, script.Progress } do
	for key, entry in require(part) :: { [string]: Entry } do
		catalog[key] = entry
	end
end

local Strings = {}

local function supportedLanguage(value: any): string?
	if typeof(value) ~= "string" then
		return nil
	end
	local raw = string.lower(value)
	local language = raw:match("^([a-z][a-z])[-_]") or raw
	return if table.find(Config.game.languages, language) then language else nil
end

function Strings.localeOf(player: Player?): string
	local localPlayer = game:GetService("Players").LocalPlayer
	local selected = player or localPlayer
	if selected then
		if selected == localPlayer then
			local immediate = supportedLanguage(selected:GetAttribute("MineLanguage"))
			if immediate then
				return immediate
			end
		end
		local override = supportedLanguage(selected:GetAttribute("language"))
		if override then
			return override
		end
		local account = supportedLanguage(selected.LocaleId)
		if account then
			return account
		end
	end
	if localPlayer and selected == localPlayer then
		local device = supportedLanguage(game:GetService("LocalizationService").RobloxLocaleId)
		if device then
			return device
		end
	end
	return defaultLanguage
end

function Strings.has(key: string, locale: string?): boolean
	local entry = catalog[key]
	return entry ~= nil and entry[locale or defaultLanguage] ~= nil
end

function Strings.t(key: string, locale: string?, ...: any): string
	local entry = catalog[key]
	local text = entry and (entry[locale or defaultLanguage] or entry[defaultLanguage])
	if not text then
		if game and game:GetService("RunService"):IsStudio() then
			warn("[Strings] Missing translation: " .. key)
		end
		return key
	end
	local args = table.pack(...)
	return (
		text:gsub("{(%d+)}", function(index)
			local value = args[tonumber(index) :: number]
			return if value == nil then nil else tostring(value)
		end)
	)
end

return Strings
