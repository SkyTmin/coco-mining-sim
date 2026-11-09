--!nocheck
-- Studio-side loader: fetches a Luau file from the agent's local static server and runs it.
-- Cheap sync path (no code goes through the MCP tool call): the agent serves the repo root on
-- http://127.0.0.1:8766 (scratchpad static-repo.mjs or `npx serve`), generates sync.luau with
-- scripts/make-studio-sync.mjs, then runs THIS snippet via execute_luau (Edit) with FILE set.
-- HttpService.GetAsync must run outside the execute_luau thread (task.spawn), otherwise it hangs;
-- the result lands in ServerStorage.SyncResult — read it with a second execute_luau after ~2 s.
local FILE = "sync-part.luau" -- or scripts/build-prison.luau, scripts/decorate-prison.luau, ...

local HttpService = game:GetService("HttpService")
pcall(function()
	HttpService.HttpEnabled = true
end)
local SS = game:GetService("ServerStorage")
local v = SS:FindFirstChild("SyncResult") or Instance.new("StringValue")
v.Name = "SyncResult"
v.Value = "pending"
v.Parent = SS
task.spawn(function()
	local ok, res = pcall(function()
		return HttpService:GetAsync("http://127.0.0.1:8766/" .. FILE)
	end)
	if not ok then
		v.Value = "ERR " .. tostring(res)
		return
	end
	local fn, err = loadstring(res)
	if not fn then
		v.Value = "LOADERR " .. tostring(err)
		return
	end
	local ok2, r = pcall(fn)
	v.Value = (ok2 and "OK " or "RUNERR ") .. tostring(r)
end)
return "spawned " .. FILE
