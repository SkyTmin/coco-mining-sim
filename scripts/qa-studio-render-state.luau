--!strict
-- Read-only preflight: minimized Studio can simulate without rendering frames.
local RunService = game:GetService("RunService")
assert(RunService:IsStudio() and RunService:IsClient())

local frames, heartbeats = 0, 0
local render = RunService.RenderStepped:Connect(function()
	frames += 1
end)
local simulation = RunService.Heartbeat:Connect(function()
	heartbeats += 1
end)
task.wait(1)
render:Disconnect()
simulation:Disconnect()
return game:GetService("HttpService"):JSONEncode({
	rendering = frames > 0,
	renderFrames = frames,
	heartbeats = heartbeats,
	capture = if frames > 0
		then "available"
		else "skip: rendering paused; leave Studio unminimized for visual QA",
})
