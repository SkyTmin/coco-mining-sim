--!strict
-- Run in Studio Edit mode; the owner saves the place.
local RunService = game:GetService("RunService")
assert(RunService:IsStudio() and not RunService:IsRunning())

workspace.StreamingEnabled = true
-- Some Studio contexts cannot write these properties.
local tuned = pcall(function()
	workspace.StreamingTargetRadius = 256
	workspace.StreamOutBehavior = Enum.StreamOutBehavior.Opportunistic
end)
return if tuned
	then "streaming on (256 / opportunistic)"
	else "streaming on (check tuning in Properties)"
