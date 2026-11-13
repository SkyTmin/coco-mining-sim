--!strict

local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
local Types = require(Shared.Types)
local Wire = require(Shared.Wire)

local ProfileState = {}
local changed = Instance.new("BindableEvent")
ProfileState.changed = changed.Event
local profile: Types.Profile? = nil
local earlyPatches: { { Types.ProfilePatchOp } } = {}
local overrides: { [string]: any } = {}
local pending: { [string]: any } = {}
local lastSent = -math.huge
local flushPending = false
local UPDATE_INTERVAL = 0.16

local function apply(current: Types.Profile, ops: { Types.ProfilePatchOp })
	for _, op in ops do
		(current :: any)[op.k] = if op.d then nil else Wire.decode(op.v)
	end
end

function ProfileState.getProfile(): Types.Profile?
	return profile
end

function ProfileState.preference(key: string): any
	if overrides[key] ~= nil then
		return overrides[key]
	end
	local settings = if profile then profile.settings :: any else nil
	if settings and settings[key] ~= nil then
		return settings[key]
	end
	if key == "effects" then
		return "auto"
	end
	if key == "autoQuality" then
		return Config.game.defaultAutoQuality
	end
	if key == "music" then
		return Config.music.defaultVolume
	end
	if key == "sfx" then
		return Config.sounds.rules.defaultSfx
	end
	return if key == "language" then nil else key == "haptics"
end

local function flushPreferences()
	lastSent, flushPending = os.clock(), false
	Remotes.event("CameraView"):FireServer(pending)
	pending = {}
end

function ProfileState.setPreference(key: string, value: any)
	overrides[key], pending[key] = value, value
	if key == "language" then
		Players.LocalPlayer:SetAttribute("MineLanguage", value)
	end
	if not flushPending then
		local remaining = UPDATE_INTERVAL - (os.clock() - lastSent)
		if remaining <= 0 then
			flushPreferences()
		else
			flushPending = true
			task.delay(remaining, flushPreferences)
		end
	end
end

function ProfileState.setSnapshot(snapshot: any)
	local decoded = Wire.decode(snapshot) :: Types.Profile
	for _, ops in earlyPatches do
		apply(decoded, ops)
	end
	table.clear(earlyPatches)
	profile = decoded
	changed:Fire(true)
end

function ProfileState.applyPatch(ops: { Types.ProfilePatchOp })
	if profile then
		apply(profile, ops)
		changed:Fire()
	else
		table.insert(earlyPatches, ops)
	end
end

return ProfileState
