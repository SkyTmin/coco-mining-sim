--!strict

local InputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local Gesture = require(game:GetService("ReplicatedStorage").Shared.Mine.TouchGesture)
local Input = {}

function Input.start(callbacks: any)
	local touch: InputObject?
	local gesture: Gesture.Gesture?
	local heldMouse, rotating = false, false

	local function center(): Vector2
		local camera = workspace.CurrentCamera
		return if camera then camera.ViewportSize / 2 else Vector2.zero
	end
	local function mousePoint(): Vector2
		return if callbacks.first() then center() else InputService:GetMouseLocation()
	end
	local function strike(point: Vector2): boolean
		local target = callbacks.aim(point)
		if target then
			callbacks.hit(target)
		end
		return target ~= nil
	end
	local function beginTouch(input: InputObject, processed: boolean)
		if processed or touch or not callbacks.active() or input.Position.X < center().X then
			return
		end
		touch, gesture = input, Gesture.begin(input.Position.X, input.Position.Y, os.clock())
	end
	local function moveTouch(input: InputObject)
		local g = gesture
		if touch ~= input or not g then
			return
		end
		local dx, dy = Gesture.move(g, input.Position.X, input.Position.Y)
		if (g.panning or g.holding) and callbacks.active() then
			callbacks.pan(Vector2.new(dx, dy))
		end
	end
	local function endTouch(input: InputObject)
		if input ~= touch or not gesture then
			return
		end
		moveTouch(input)
		local tap = Gesture.finish(gesture, os.clock())
			and input.UserInputState == Enum.UserInputState.End
		touch, gesture = nil, nil
		if tap and callbacks.active() then
			strike(center())
		end
	end
	InputService.InputBegan:Connect(function(input, processed)
		if processed then
			return
		end
		if input.KeyCode == Enum.KeyCode.Q then
			callbacks.ult()
			return
		elseif input.KeyCode == Enum.KeyCode.V then
			callbacks.toggle()
			return
		elseif input.KeyCode == Enum.KeyCode.R then
			callbacks.focus()
			return
		end
		if input.UserInputType == Enum.UserInputType.Touch then
			beginTouch(input, processed)
			return
		end
		if not callbacks.active() then
			return
		end
		if input.UserInputType == Enum.UserInputType.MouseButton1 then
			heldMouse = strike(mousePoint())
		elseif input.UserInputType == Enum.UserInputType.MouseButton2 then
			rotating = true
		end
	end)
	InputService.InputChanged:Connect(function(input)
		if input == touch then
			moveTouch(input)
		elseif
			input.UserInputType == Enum.UserInputType.MouseMovement
			and (callbacks.first() or rotating)
			and callbacks.active()
		then
			callbacks.pan(Vector2.new(input.Delta.X, input.Delta.Y))
		end
	end)
	InputService.InputEnded:Connect(function(input)
		if input == touch then
			endTouch(input)
		elseif input.UserInputType == Enum.UserInputType.MouseButton1 then
			heldMouse = false
		elseif input.UserInputType == Enum.UserInputType.MouseButton2 then
			rotating = false
		end
	end)
	InputService.WindowFocusReleased:Connect(function()
		heldMouse, rotating, touch, gesture = false, false, nil, nil
	end)
	RunService.RenderStepped:Connect(function()
		local digging = gesture and Gesture.step(gesture, os.clock())
		if not callbacks.canHit() then
			return
		end
		if digging then
			strike(center())
		elseif heldMouse then
			strike(mousePoint())
		end
	end)
end
return Input
