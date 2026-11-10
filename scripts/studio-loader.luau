--!strict
-- Run in Studio Edit mode with the local repo server running.
-- Check ServerStorage.SyncResult after the asynchronous fetch and execution finish.
local FILE = "build/studio-sync.luau"

local RunService = game:GetService("RunService")
assert(RunService:IsStudio() and not RunService:IsRunning())

local HttpService = game:GetService("HttpService")
local ServerStorage = game:GetService("ServerStorage")
local value = ServerStorage:FindFirstChild("SyncResult") or Instance.new("StringValue")
assert(value:IsA("StringValue"))
value.Name = "SyncResult"
value.Value = "pending"
value.Parent = ServerStorage

task.spawn(function()
	local ok, source = pcall(HttpService.GetAsync, HttpService, "http://127.0.0.1:8766/" .. FILE)
	if not ok then
		value.Value = "ERR " .. tostring(source)
		return
	end
	local chunk, problem = loadstring(source)
	if not chunk then
		value.Value = "LOADERR " .. tostring(problem)
		return
	end
	local ran, result = pcall(chunk)
	value.Value = (if ran then "OK " else "RUNERR ") .. tostring(result)
end)
return "spawned " .. FILE
