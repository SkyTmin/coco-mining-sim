--!strict
-- Available during ReplicatedFirst loading; no Shared modules, remotes or waits.
local Locale = {}
local SUPPORTED = { ru = true, en = true, es = true, fr = true }
function Locale.normalize(value: any): string
	if typeof(value) ~= "string" then
		return "en"
	end
	local raw = string.lower(value):match("^%s*(.-)%s*$") or ""
	local language = raw:match("^([a-z][a-z])[-_]") or raw
	return if SUPPORTED[language] then language else "en"
end
function Locale.detect(player: Player?): string
	local selected = player
	if not selected then
		selected = game:GetService("Players").LocalPlayer
	end
	if selected then
		local ok, value = pcall(function()
			return selected.LocaleId
		end)
		if ok and typeof(value) == "string" and value ~= "" then
			return Locale.normalize(value)
		end
	end
	local ok, value = pcall(function()
		return game:GetService("LocalizationService").RobloxLocaleId
	end)
	return Locale.normalize(if ok then value else nil)
end
function Locale.resolve(savedLocale: any, player: Player?): string
	if typeof(savedLocale) == "string" and SUPPORTED[savedLocale] then
		return savedLocale
	end
	if player and player:GetAttribute("LocaleManual") == true then
		local manual = player:GetAttribute("Locale")
		if typeof(manual) == "string" and SUPPORTED[manual] then
			return manual
		end
	end
	return Locale.detect(player)
end
return Locale
