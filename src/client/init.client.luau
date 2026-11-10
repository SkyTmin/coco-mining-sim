--!strict

local Players = game:GetService("Players")
local ReplicatedFirst = game:GetService("ReplicatedFirst")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local Shared = ReplicatedStorage:WaitForChild("Shared")
local loading = ReplicatedFirst:WaitForChild("Loading")
local State = require(loading:WaitForChild("LoadingState"))
local Remotes = require(Shared:WaitForChild("Remotes"))
local ProfileState = require(script.ProfileState)
local studio = RunService:IsStudio()

Remotes.event("ProfileUpdated").OnClientEvent:Connect(function(snapshot)
	ProfileState.setSnapshot(snapshot)
	State.profileReceived = true
	local profile = ProfileState.getProfile()
	if studio and profile then
		print(
			string.format(
				"[Profile] ProfileUpdated v%d, coins=%s",
				profile.v,
				tostring(profile.coins)
			)
		)
	end
end)
Remotes.event("ProfilePatch").OnClientEvent:Connect(function(ops)
	local previous = ProfileState.getProfile()
	local previousCoins = if previous then previous.coins else nil
	ProfileState.applyPatch(ops)
	local profile = ProfileState.getProfile()
	if studio and profile and profile.coins ~= previousCoins then
		print("[Profile] ProfilePatch coins=" .. tostring(profile.coins))
	end
end)

local Strings = require(Shared:WaitForChild("Strings"))
local function translate(key: string, ...: any): string
	return Strings.t(key, Strings.localeOf(player), ...)
end

local playerGui = player:WaitForChild("PlayerGui")
local showToast = require(script.Toast).create(playerGui, translate)
Remotes.event("Toast").OnClientEvent:Connect(showToast)
require(script.CreativeWindow).start(
	player,
	playerGui,
	translate,
	Remotes.event("Creative"),
	Remotes.event("ServerLog")
)
require(script.Mine.Controller).start(playerGui, translate)
State.clientReady = true
