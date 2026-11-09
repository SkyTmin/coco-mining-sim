--!nocheck
-- Read-only capture preflight. A minimized Studio can simulate without drawing a single frame.
assert(game.RunService:IsStudio() and game.RunService:IsClient())
local frames,heartbeats=0,0
local render=game.RunService.RenderStepped:Connect(function()frames+=1 end)
local simulation=game.RunService.Heartbeat:Connect(function()heartbeats+=1 end)
task.wait(1)
render:Disconnect();simulation:Disconnect()
return game.HttpService:JSONEncode({rendering=frames>0,renderFrames=frames,heartbeats=heartbeats,capture=if frames>0 then "available"else "skip: rendering paused; leave Studio unminimized for visual QA"})
