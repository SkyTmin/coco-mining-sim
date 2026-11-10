--!strict

local ContextActionService = game:GetService("ContextActionService")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

local Candy = {}
Candy.ink = Color3.fromHex("1E2140")
Candy.panelColor = Color3.fromHex("FFF8EC")
Candy.rowColor = Color3.fromHex("F2E6D2")
Candy.green = Color3.fromHex("16A34A")
Candy.red = Color3.fromHex("B3202E")
Candy.purple = Color3.fromHex("A855F7")
Candy.pink = Color3.fromHex("EC4899")
Candy.white = Color3.new(1, 1, 1)
Candy.font = Font.fromEnum(Enum.Font.GothamBlack)

-- Variant A sizes in design pixels at 667 px. Insets and the UIScale are applied once.
local WIDTH = 667
local BORDER, CORNER, SHADOW = WIDTH * 0.0055, WIDTH * 0.022, WIDTH * 0.007
local ATLAS = "rbxassetid://131511417355722"
local ICONS = {
	coin = 0,
	upgrades = 1,
	ult = 2,
	settings = 3,
	eye = 4,
	lock = 5,
	power = 6,
	coins = 7,
	crit = 8,
	shape1 = 9,
	shape2 = 10,
	shape3 = 11,
	shape4 = 12,
	shape5 = 13,
	shape6 = 14,
	width = 15,
	pick = 16,
}

type Geometry = { size: UDim2, at: UDim2 }
export type Control = {
	box: Frame,
	input: TextButton,
	face: Frame,
	text: TextLabel,
	image: ImageLabel,
	shadow: Frame,
	gradient: UIGradient,
	kind: string,
	pressed: boolean,
	tween: Tween?,
}
export type Window = {
	layer: Frame,
	panel: Frame,
	title: TextLabel,
	open: boolean,
	onChange: (boolean) -> (),
	dimmer: TextButton,
	tween: Tween?,
}
local windowOpen: Window?
local unit = 1
local canvas: Frame?
local geometry: { [GuiObject]: Geometry } = {}
local radii: { [UICorner]: number } = {}
local strokes: { [UIStroke]: number } = {}
local sizes: { [UITextSizeConstraint]: number } = {}
local function scaled(v: UDim2): UDim2
	return UDim2.new(v.X.Scale, v.X.Offset * unit, v.Y.Scale, v.Y.Offset * unit)
end

function Candy.fit(gui: GuiObject, size: UDim2, at: UDim2)
	if not geometry[gui] then
		gui.Destroying:Once(function()
			geometry[gui] = nil
		end)
	end
	geometry[gui] = { size = size, at = at }
	gui.Size, gui.Position = scaled(size), scaled(at)
end

function Candy.move(gui: GuiObject, at: UDim2)
	local g = geometry[gui]
	if g then
		g.at = at
	end
	gui.Position = scaled(at)
end

function Candy.point(p: Vector2): UDim2
	local root = canvas
	if root and root.AbsoluteSize.X > 0 and root.AbsoluteSize.Y > 0 then
		local localPoint = p - root.AbsolutePosition
		return UDim2.fromScale(
			localPoint.X / root.AbsoluteSize.X,
			localPoint.Y / root.AbsoluteSize.Y
		)
	end
	return UDim2.fromOffset(p.X, p.Y)
end

function Candy.layer(parent: Instance, name: string, z: number): Frame
	local root = canvas
	if not root then
		local gui = Instance.new("ScreenGui")
		gui.Name, gui.ResetOnSpawn, gui.DisplayOrder = "MineCandy", false, 7
		gui.IgnoreGuiInset, gui.ScreenInsets = true, Enum.ScreenInsets.DeviceSafeInsets
		gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
		local app = Instance.new("Frame")
		app.Name, app.BackgroundTransparency, app.Parent = "Canvas", 1, gui
		local scale = Instance.new("UIScale")
		scale.Parent = app
		canvas, root = app, app
		local function resize()
			local safe = gui.AbsoluteSize
			local camera = workspace.CurrentCamera
			if safe.X <= 0 or safe.Y <= 0 then
				safe = if camera then camera.ViewportSize else Vector2.new(WIDTH, 375)
			end
			local limit = if UserInputService.TouchEnabled then 1.5 else 1.35
			scale.Scale = math.clamp(math.min(safe.X, safe.Y) / 390, 0.85, limit)
			app.Size = UDim2.fromOffset(safe.X / scale.Scale, safe.Y / scale.Scale)
			unit = math.min(safe.X / WIDTH / scale.Scale, 1.35)
			for object, g in geometry do
				object.Size, object.Position = scaled(g.size), scaled(g.at)
			end
			for corner, radius in radii do
				corner.CornerRadius = UDim.new(0, radius * unit)
			end
			for stroke, width in strokes do
				stroke.Thickness = width * unit
			end
			for constraint, size in sizes do
				constraint.MaxTextSize = math.max(10, math.round(size * unit))
			end
		end
		gui.Parent = parent
		resize()
		gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(resize)
	end
	local layer = Instance.new("Frame")
	layer.Name, layer.BackgroundTransparency, layer.Size, layer.ZIndex =
		name, 1, UDim2.fromScale(1, 1), z
	layer.Parent = root
	return layer
end

function Candy.round(gui: GuiObject, radius: number?)
	local corner = Instance.new("UICorner")
	if radius == 0 then
		corner.CornerRadius = UDim.new(0.5, 0)
	else
		local r = radius or CORNER
		radii[corner], corner.CornerRadius = r, UDim.new(0, r * unit)
		corner.Destroying:Once(function()
			radii[corner] = nil
		end)
	end
	corner.Parent = gui
end

function Candy.stroke(gui: GuiObject, thickness: number?, text: boolean?): UIStroke
	local border = Instance.new("UIStroke")
	border.Color = Candy.ink
	border.ApplyStrokeMode = if text
		then Enum.ApplyStrokeMode.Contextual
		else Enum.ApplyStrokeMode.Border
	local t = thickness or BORDER
	strokes[border], border.Thickness, border.Parent = t, t * unit, gui
	border.Destroying:Once(function()
		strokes[border] = nil
	end)
	return border
end

function Candy.frame(parent: Instance, name: string, size: UDim2, at: UDim2, color: Color3?): Frame
	local f = Instance.new("Frame")
	f.Name, f.BorderSizePixel = name, 0
	f.BackgroundTransparency = if color then 0 else 1
	if color then
		f.BackgroundColor3 = color
	end
	Candy.fit(f, size, at)
	f.Parent = parent
	return f
end

function Candy.panel(
	parent: Instance,
	name: string,
	size: UDim2,
	at: UDim2,
	row: boolean?
): (Frame, Frame)
	local box = Candy.frame(parent, name, size, at)
	if not row then
		local shadow = Candy.frame(
			box,
			"Shadow",
			UDim2.fromScale(1, 1),
			UDim2.fromOffset(0, SHADOW),
			Candy.ink
		)
		Candy.round(shadow)
		Candy.stroke(shadow)
	end
	local surface = Candy.frame(
		box,
		"Surface",
		UDim2.fromScale(1, 1),
		UDim2.fromScale(0, 0),
		if row then Candy.rowColor else Candy.panelColor
	)
	Candy.round(surface)
	Candy.stroke(surface)
	return box, surface
end

function Candy.text(
	parent: Instance,
	name: string,
	size: UDim2,
	at: UDim2,
	maxSize: number,
	color: Color3?
): TextLabel
	local label = Instance.new("TextLabel")
	label.Name, label.FontFace, label.TextColor3 = name, Candy.font, color or Candy.ink
	label.Text, label.TextScaled, label.BackgroundTransparency = "", true, 1
	Candy.fit(label, size, at)
	local limit = Instance.new("UITextSizeConstraint")
	limit.MinTextSize, limit.MaxTextSize = 10, math.max(10, math.round(maxSize * unit))
	sizes[limit], limit.Parent = maxSize, label
	limit.Destroying:Once(function()
		sizes[limit] = nil
	end)
	label.Parent = parent
	return label
end

function Candy.setIcon(image: ImageLabel, key: string?)
	local i = if key then ICONS[key] else nil
	image.Visible = i ~= nil
	if i then
		image.ImageRectOffset = Vector2.new(i % 6 * 96, i // 6 * 96)
	end
end

function Candy.icon(parent: Instance, key: string?, size: UDim2, at: UDim2): ImageLabel
	local label = Instance.new("ImageLabel")
	label.Name, label.BackgroundTransparency, label.ScaleType = "Sticker", 1, Enum.ScaleType.Fit
	label.Image, label.ImageRectSize = ATLAS, Vector2.new(96, 96)
	Candy.fit(label, size, at)
	Candy.setIcon(label, key)
	label.Parent = parent
	return label
end

function Candy.iconCell(parent: Instance, key: string, size: UDim2, at: UDim2): ImageLabel
	local cell = Candy.frame(parent, "IconCell", size, at, Candy.white)
	Candy.round(cell, WIDTH * 0.016)
	Candy.stroke(cell, WIDTH * 0.0045)
	return Candy.icon(cell, key, UDim2.fromScale(0.88, 0.88), UDim2.fromScale(0.06, 0.06))
end

function Candy.bar(parent: Instance, size: UDim2, at: UDim2, color: Color3): Frame
	local track = Candy.frame(parent, "Track", size, at, Color3.fromHex("E4D6BD"))
	Candy.round(track, 0)
	local fill = Candy.frame(track, "Fill", UDim2.fromScale(0, 1), UDim2.fromScale(0, 0), color)
	Candy.round(fill, 0)
	return fill
end

function Candy.dot(parent: Instance): Frame
	local dot = Candy.frame(
		parent,
		"Affordable",
		UDim2.fromOffset(16, 16),
		UDim2.new(1, -10, 0, -8),
		Color3.fromHex("FF3B4E")
	)
	Candy.round(dot, 0)
	Candy.stroke(dot, 2).Color = Candy.white
	dot.Visible = false
	return dot
end

local colors = {
	coin = Color3.fromHex("FFC83D"),
	robux = Color3.fromHex("22C55E"),
	confirm = Color3.fromHex("3D8BFF"),
	close = Color3.fromHex("FF4D5E"),
	disabled = Color3.fromHex("B8BDC9"),
	special = Candy.white,
	purple = Candy.purple,
	neutral = Candy.panelColor,
}

function Candy.paint(button: Control, kind: string)
	button.kind = kind
	button.face.BackgroundColor3 = colors[kind] or colors.neutral
	button.gradient.Enabled = kind == "special"
	button.text.TextColor3 = if kind == "disabled"
		then Candy.red
		elseif kind == "close" or kind == "purple" or kind == "confirm" then Candy.white
		else Candy.ink
end

function Candy.buttonIcon(button: Control, key: string?, alone: boolean?)
	Candy.setIcon(button.image, key)
	if alone then
		Candy.fit(button.image, UDim2.fromScale(0.65, 0.65), UDim2.fromScale(0.175, 0.175))
		button.text.Visible = false
	else
		button.text.Visible = true
		Candy.fit(button.image, UDim2.fromScale(0.26, 0.8), UDim2.fromScale(0.06, 0.1))
		Candy.fit(
			button.text,
			UDim2.fromScale(if key then 0.64 else 0.88, 0.84),
			UDim2.fromScale(if key then 0.31 else 0.06, 0.08)
		)
	end
end

function Candy.pointer(input: InputObject): boolean
	return input.UserInputType == Enum.UserInputType.Touch
		or input.UserInputType == Enum.UserInputType.MouseButton1
end

function Candy.press(button: Control, down: boolean)
	if button.pressed == down or (down and button.kind == "disabled") then
		return
	end
	button.pressed = down
	button.shadow.Visible = not down
	if button.tween then
		button.tween:Cancel()
	end
	local info = if down
		then TweenInfo.new(0.06, Enum.EasingStyle.Quad)
		else TweenInfo.new(0.14, Enum.EasingStyle.Back)
	local target = UDim2.fromOffset(0, if down then SHADOW * unit else 0)
	local tween = TweenService:Create(button.face, info, { Position = target })
	button.tween = tween
	tween:Play()
end

function Candy.button(
	parent: Instance,
	name: string,
	size: UDim2,
	at: UDim2,
	kind: string,
	fontSize: number,
	circle: boolean?
): Control
	local box = Candy.frame(parent, name, size, at)
	local input = Instance.new("TextButton")
	input.Name, input.Text, input.BackgroundTransparency, input.AutoButtonColor =
		"Input", "", 1, false
	input.ZIndex, input.Parent = 3, box
	local minimum = if name == "Close" then 64 else 52
	local padding = if circle and size.X.Scale == 0
		then math.max(0, (minimum - size.X.Offset) / 2)
		else 0
	Candy.fit(
		input,
		UDim2.new(1, padding * 2, 1, padding * 2),
		UDim2.fromOffset(-padding, -padding)
	)
	local shadow =
		Candy.frame(box, "Shadow", UDim2.fromScale(1, 1), UDim2.fromOffset(0, SHADOW), Candy.ink)
	local face =
		Candy.frame(box, "Face", UDim2.fromScale(1, 1), UDim2.fromScale(0, 0), Candy.panelColor)
	for _, skin in { shadow, face } do
		Candy.round(skin, if circle then 0 else 12)
		Candy.stroke(skin)
	end
	local gradient = Instance.new("UIGradient")
	gradient.Color, gradient.Rotation = ColorSequence.new(Candy.purple, Candy.pink), 45
	gradient.Parent = face
	local text = Candy.text(
		face,
		"Label",
		UDim2.fromScale(0.88, 0.84),
		UDim2.fromScale(0.06, 0.08),
		fontSize
	)
	local image = Candy.icon(face, nil, UDim2.fromScale(0.26, 0.8), UDim2.fromScale(0.06, 0.1))
	local control: Control = {
		box = box,
		input = input,
		face = face,
		shadow = shadow,
		gradient = gradient,
		text = text,
		image = image,
		kind = kind,
		pressed = false,
	}
	Candy.paint(control, kind)
	input.InputBegan:Connect(function(key)
		if Candy.pointer(key) then
			Candy.press(control, true)
		end
	end)
	input.InputEnded:Connect(function(key)
		if Candy.pointer(key) then
			Candy.press(control, false)
		end
	end)
	input.MouseLeave:Connect(function()
		Candy.press(control, false)
	end)
	return control
end

function Candy.ribbon(
	parent: Instance,
	name: string,
	size: UDim2,
	at: UDim2,
	color: Color3
): (TextLabel, Frame)
	local ribbon = Candy.frame(parent, name, size, at, color)
	ribbon.Rotation = -2
	Candy.round(ribbon, WIDTH * 0.018)
	Candy.stroke(ribbon)
	return Candy.text(
		ribbon,
		"Label",
		UDim2.fromScale(0.92, 0.90),
		UDim2.fromScale(0.04, 0.05),
		19,
		Candy.white
	),
		ribbon
end

function Candy.coin(
	parent: Instance,
	name: string,
	size: UDim2,
	at: UDim2,
	fontSize: number
): TextLabel
	local wallet = Candy.panel(parent, name, size, at)
	Candy.icon(wallet, "coin", UDim2.fromScale(0.29, 0.92), UDim2.fromScale(0.05, 0.04))
	return Candy.text(
		wallet,
		"Amount",
		UDim2.fromScale(0.62, 0.92),
		UDim2.fromScale(0.34, 0.04),
		fontSize
	)
end

local ACTION = "CandyCloseWindow"
function Candy.show(window: Window, open: boolean)
	if window.open == open then
		return
	end
	if open and windowOpen then
		Candy.show(windowOpen, false)
	end
	window.open = open
	if window.tween then
		window.tween:Cancel()
	end
	if open then
		windowOpen = window
		window.layer.Visible = true
		window.panel.Position = UDim2.fromScale(0.5, 0.58)
		window.dimmer.BackgroundTransparency = 1
		TweenService:Create(window.dimmer, TweenInfo.new(0.12), { BackgroundTransparency = 0.55 })
			:Play()
		local tween = TweenService:Create(
			window.panel,
			TweenInfo.new(0.2, Enum.EasingStyle.Back),
			{ Position = UDim2.fromScale(0.5, 0.55) }
		)
		window.tween = tween
		tween:Play()
		ContextActionService:BindActionAtPriority(
			ACTION,
			function(_, state)
				if state == Enum.UserInputState.Begin and windowOpen then
					Candy.show(windowOpen, false)
				end
				return Enum.ContextActionResult.Sink
			end,
			false,
			Enum.ContextActionPriority.High.Value + 1,
			Enum.KeyCode.Escape,
			Enum.KeyCode.ButtonB
		)
	else
		windowOpen = nil
		ContextActionService:UnbindAction(ACTION)
		local tween =
			TweenService:Create(window.dimmer, TweenInfo.new(0.12), { BackgroundTransparency = 1 })
		window.tween = tween
		tween:Play()
		task.delay(0.12, function()
			if not window.open then
				window.layer.Visible = false
			end
		end)
	end
	window.onChange(open)
end

function Candy.modal(
	parent: Instance,
	name: string,
	size: UDim2,
	color: Color3,
	onChange: (boolean) -> ()
): Window
	local layer = Candy.layer(parent, name, 15)
	layer.Visible = false
	local dimmer = Instance.new("TextButton")
	dimmer.Name, dimmer.Text, dimmer.BackgroundColor3 = "Backdrop", "", Color3.new()
	dimmer.AutoButtonColor, dimmer.BorderSizePixel, dimmer.Size = false, 0, UDim2.fromScale(1, 1)
	dimmer.Parent = layer
	local panel = Candy.panel(layer, "Panel", size, UDim2.fromScale(0.5, 0.55))
	panel.AnchorPoint, panel.Active = Vector2.new(0.5, 0.5), true
	local title =
		Candy.ribbon(panel, "Title", UDim2.fromOffset(154, 36), UDim2.fromOffset(16, -15), color)
	local close = Candy.button(
		panel,
		"Close",
		UDim2.fromOffset(42, 42),
		UDim2.fromScale(1, 0),
		"close",
		28,
		true
	)
	close.box.AnchorPoint = Vector2.new(0.5, 0.5)
	close.text.Text = "×"
	local window: Window = {
		layer = layer,
		panel = panel,
		title = title,
		open = false,
		onChange = onChange,
		dimmer = dimmer,
	}
	close.input.Activated:Connect(function()
		Candy.show(window, false)
	end)
	dimmer.Activated:Connect(function()
		Candy.show(window, false)
	end)
	return window
end

return Candy
