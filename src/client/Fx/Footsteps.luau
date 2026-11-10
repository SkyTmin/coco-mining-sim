--!strict

local Shared = game:GetService("ReplicatedStorage").Shared
local Sfx = require(Shared.Sfx)

local Footsteps = {}
local STRIDE = 7 -- from coco-prison-roblox Footsteps
export type State = { character: Model?, last: Vector3?, distance: number }

function Footsteps.new(): State
	return { distance = 0 }
end

function Footsteps.step(state: State, character: Model?, dirt: boolean)
	if not character then
		state.character, state.last, state.distance = nil, nil, 0
		return
	end
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	local root = character:FindFirstChild("HumanoidRootPart")
	if not humanoid or not root or not root:IsA("BasePart") then
		return
	end
	local running = root:FindFirstChild("Running")
	if running and running:IsA("Sound") and running.Volume ~= 0 then
		running.Volume = 0
	end
	local at = root.Position
	if state.character ~= character then
		state.character, state.last, state.distance = character, at, 0
	end
	local delta = at - (state.last or at)
	state.last = at
	if humanoid.FloorMaterial == Enum.Material.Air or humanoid.Health <= 0 then
		return
	end
	local travel = Vector2.new(delta.X, delta.Z).Magnitude
	if travel >= 20 then
		state.distance = 0
		return
	end
	state.distance += travel
	if state.distance >= STRIDE then
		state.distance %= STRIDE
		Sfx.play(if dirt then "step_dirt" else "step_stone", 0.08)
	end
end

return Footsteps
