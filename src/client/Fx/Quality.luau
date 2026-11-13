--!strict
local UIS = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local Lighting = game:GetService("Lighting")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Rules = require(Shared.Play.QualityRules)
local Budget = require(Shared.Play.EffectBudget)
local Profile = require(script.Parent.Parent.ProfileState)
local Quality = {}
local state = Rules.new(nil, os.clock())
local callbacks, leases = {}, {}
local observers = {}
function Quality.observe(kind: string, fn: () -> number)
	local list = observers[kind] or {}
	observers[kind] = list
	table.insert(list, fn)
end
local function observed(kind: string): number
	local total = 0
	for _, fn in observers[kind] or {} do
		total += fn()
	end
	return total
end
local focused, loaded, owner = true, false, nil
local limits = {}
local bloom, blur = nil, nil
local function refresh()
	for key, values in Config.fx.quality do
		if type(values) == "table" then
			limits[key] = values[state.level]
		end
	end
end
refresh()
function Quality.level(): number
	return state.level
end
function Quality.budget(): any
	return limits
end
function Quality.onChanged(fn: (number, string) -> ())
	table.insert(callbacks, fn)
end
function Quality.available(kind: string): number
	local list = leases[kind] or {}
	local alive, recent = Budget.usage(list, os.clock())
	return math.max(
		0,
		math.min(
			limits[kind] - math.max(alive, observed(kind)),
			if kind == "debris" then limits.debrisPerSecond - recent else math.huge
		)
	)
end
function Quality.reserve(kind: string, count: number, life: number): number
	local list = leases[kind]
	if not list then
		list = {}
		leases[kind] = list
	end
	count = math.min(count, limits[kind] - observed(kind))
	return Budget.take(
		list,
		os.clock(),
		count,
		life,
		limits[kind],
		if kind == "debris" then limits.debrisPerSecond else nil
	)
end
local function changed(reason: string)
	refresh()
	if owner then
		owner:SetAttribute("MineQuality", state.level)
	end
	for _, fn in callbacks do
		fn(state.level, reason)
	end
end
function Quality.start(player: Player)
	owner = player
	UIS.WindowFocused:Connect(function()
		focused = true
	end)
	UIS.WindowFocusReleased:Connect(function()
		focused = false
	end)
	bloom = Instance.new("BloomEffect")
	bloom.Name, bloom.Intensity, bloom.Size, bloom.Threshold, bloom.Parent =
		"MineBloom",
		Config.fx.qualityRuntime.bloomIntensity,
		Config.fx.qualityRuntime.bloomSize,
		Config.fx.qualityRuntime.bloomThreshold,
		Lighting
	blur = Instance.new("BlurEffect")
	blur.Name, blur.Size, blur.Parent = "MineMenuBlur", Config.fx.qualityRuntime.blurSize, Lighting
end
function Quality.step(dt: number, active: boolean)
	if not loaded and Profile.getProfile() then
		state = Rules.new(Profile.preference("autoQuality"), os.clock())
		loaded = true
		Rules.select(state, Profile.preference("effects"))
		changed("loaded")
	end
	local mode = Profile.preference("effects")
	if mode ~= state.mode then
		state.saved = Profile.preference("autoQuality")
		if Rules.select(state, mode) then
			changed("manual")
		end
	end
	local fps = if owner and RunService:IsStudio() then owner:GetAttribute("QaFps") else nil
	if type(fps) ~= "number" or not (fps > 0 and fps < math.huge) then
		fps = nil
	end
	local reason = Rules.step(state, dt, active and focused, fps)
	if reason then
		changed(reason)
	end
	local save = Rules.save(state, os.clock())
	if save then
		Profile.setPreference("autoQuality", save)
	end
	if bloom then
		bloom.Enabled = active and limits.bloom
	end
	if blur then
		blur.Enabled = limits.blur
			and owner ~= nil
			and (
				owner:GetAttribute("MineRebirthOpen") == true
				or owner:GetAttribute("MineUpgradesOpen") == true
				or owner:GetAttribute("MineSettingsOpen") == true
			)
	end
end
return Quality
