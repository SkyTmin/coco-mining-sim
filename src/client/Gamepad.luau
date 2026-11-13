--!strict
-- Gamepad play [владелец 13.11, Steam Deck: «сложно управлять, добавь геймпад управление»].
--   RT / RB — dig (hold) at the crosshair · Y — ult · right stick — look around · R3 — first / third person · L3 — face the
--   wall · X — the cards menu · in a window: D-pad / left stick move between buttons, A presses, B closes.
-- This module only knows whether the gamepad is the device in use and draws the button glyphs; the bindings live in
-- Mine/Input (mine), Candy (window selection) and the HUD.
local UIS = game:GetService("UserInputService")
local GuiService = game:GetService("GuiService")
local Gamepad = {}

local GAMEPADS = {
	[Enum.UserInputType.Gamepad1] = true,
	[Enum.UserInputType.Gamepad2] = true,
	[Enum.UserInputType.Gamepad3] = true,
	[Enum.UserInputType.Gamepad4] = true,
}

local using = GAMEPADS[UIS:GetLastInputType()] == true
local tags: { [ImageLabel]: boolean } = {}
local listeners: { (boolean) -> () } = {}

local function refresh()
	for tag in tags do
		tag.Visible = using
	end
	for _, listener in listeners do
		listener(using)
	end
end

UIS.LastInputTypeChanged:Connect(function(kind)
	local now
	if GAMEPADS[kind] then
		now = true
	elseif
		kind == Enum.UserInputType.Keyboard
		or kind == Enum.UserInputType.Touch
		or kind == Enum.UserInputType.MouseButton1
		or kind == Enum.UserInputType.MouseButton2
		or kind == Enum.UserInputType.MouseMovement
		or kind == Enum.UserInputType.MouseWheel
	then
		now = false
	else
		return -- focus, text input and the like do not switch the device
	end
	if now ~= using then
		using = now
		if not now and GuiService.SelectedObject then
			GuiService.SelectedObject = nil
		end
		refresh()
	end
end)

function Gamepad.active(): boolean
	return using
end

function Gamepad.changed(listener: (boolean) -> ())
	table.insert(listeners, listener)
end

function Gamepad.isPad(input: InputObject): boolean
	return GAMEPADS[input.UserInputType] == true
end

-- a small platform glyph (Xbox / PlayStation art from Roblox) in a corner of `parent`, shown only with a gamepad
function Gamepad.tag(parent: GuiObject, key: Enum.KeyCode, corner: Vector2?): ImageLabel
	local at = corner or Vector2.new(1, 0)
	local image = Instance.new("ImageLabel")
	image.Name, image.BackgroundTransparency = "PadGlyph", 1
	image.Image = UIS:GetImageForKeyCode(key)
	image.Size = UDim2.fromOffset(22, 22)
	image.AnchorPoint = Vector2.new(0.5, 0.5)
	image.Position = UDim2.fromScale(at.X, at.Y)
	image.ZIndex = 20
	image.Visible = using
	image.Parent = parent
	tags[image] = true
	image.Destroying:Once(function()
		tags[image] = nil
	end)
	return image
end

local function selectable(gui: Instance): boolean
	if not gui:IsA("GuiButton") or not gui.Selectable or not gui.Active then
		return false
	end
	local node: Instance? = gui
	while node and node:IsA("GuiObject") do
		if not node.Visible then
			return false
		end
		node = node.Parent
	end
	return true
end

-- puts the gamepad selection on the first visible button inside `root` (reading order: top to bottom, left to
-- right), skipping the names in `skip`; does nothing without a gamepad
function Gamepad.select(root: Instance, skip: { [string]: boolean }?)
	if not using then
		return
	end
	local best: GuiButton? = nil
	local bestY, bestX = math.huge, math.huge
	for _, d in root:GetDescendants() do
		if selectable(d) then
			local button = d :: GuiButton
			local name = if button.Parent then button.Parent.Name else ""
			if not (skip and (skip[name] or skip[button.Name])) then
				local p = button.AbsolutePosition
				if p.Y < bestY - 4 or (math.abs(p.Y - bestY) <= 4 and p.X < bestX) then
					best, bestY, bestX = button, p.Y, p.X
				end
			end
		end
	end
	if best then
		GuiService.SelectedObject = best
	end
end

-- clears the selection when it is inside `root` (a window that closes)
function Gamepad.release(root: Instance)
	local selected = GuiService.SelectedObject
	if selected and selected:IsDescendantOf(root) then
		GuiService.SelectedObject = nil
	end
end

return Gamepad
