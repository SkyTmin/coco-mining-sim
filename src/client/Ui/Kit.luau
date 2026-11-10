--!strict

local Config = require(game:GetService("ReplicatedStorage").Shared.Config)
local Kit = {}
Kit.gold = Color3.fromRGB(255, 233, 176)
Kit.light = Color3.fromRGB(255, 247, 224)
Kit.ink = Color3.fromRGB(35, 23, 20)
Kit.green = Color3.fromRGB(145, 233, 112)
Kit.body = Font.new("rbxassetid://12187365977")
Kit.title = Font.fromEnum(Enum.Font.GothamBlack)

type ButtonStyle = { color: string, enabled: boolean, hover: boolean, down: boolean }
local buttonStyles: { [TextButton]: ButtonStyle } = setmetatable({}, { __mode = "k" }) :: any

function Kit.paint(image: ImageLabel, name: string)
	local sprite = assert(Config.art.sprites[name], "Missing sprite " .. name)
	local r, s = sprite.rect, sprite.slice
	image.Image = Config.art.ui
	image.ImageRectOffset, image.ImageRectSize = Vector2.new(r[1], r[2]), Vector2.new(r[3], r[4])
	image.ResampleMode = Enum.ResamplerMode.Pixelated
	image.ScaleType = if s then Enum.ScaleType.Slice else Enum.ScaleType.Stretch
	if s then
		image.SliceCenter = Rect.new(s[1], s[2], s[3], s[4])
		image.SliceScale = 1.4
	end
end

function Kit.gui(parent: Instance, name: string, order: number, enabled: boolean): ScreenGui
	local gui = Instance.new("ScreenGui")
	gui.Name, gui.DisplayOrder, gui.ResetOnSpawn, gui.Enabled = name, order, false, enabled
	gui.IgnoreGuiInset, gui.ScreenInsets = true, Enum.ScreenInsets.DeviceSafeInsets
	gui.Parent = parent
	return gui
end

function Kit.image(
	parent: Instance,
	name: string,
	size: UDim2,
	at: UDim2,
	sprite: string,
	anchor: Vector2?
): ImageLabel
	local item = Instance.new("ImageLabel")
	item.Name, item.Size, item.Position = name, size, at
	item.AnchorPoint, item.BackgroundTransparency = anchor or Vector2.zero, 1
	Kit.paint(item, sprite)
	item.Parent = parent
	return item
end

function Kit.block(parent: Instance, name: string, size: UDim2, at: UDim2, color: Color3): Frame
	local item = Instance.new("Frame")
	item.Name, item.Size, item.Position = name, size, at
	item.BackgroundColor3, item.BorderSizePixel, item.Parent = color, 0, parent
	return item
end

function Kit.label(
	parent: Instance,
	name: string,
	size: UDim2,
	at: UDim2,
	maxSize: number,
	title: boolean?,
	color: Color3?
): TextLabel
	local item = Instance.new("TextLabel")
	item.Name, item.Size, item.Position = name, size, at
	item.Text, item.BackgroundTransparency, item.TextColor3 = "", 1, color or Kit.light
	item.FontFace, item.TextScaled = if title then Kit.title else Kit.body, true
	local limit = Instance.new("UITextSizeConstraint")
	limit.MinTextSize, limit.MaxTextSize, limit.Parent = 9, maxSize, item
	local stroke = Instance.new("UIStroke")
	stroke.Color, stroke.Thickness, stroke.ApplyStrokeMode =
		Kit.ink, 2, Enum.ApplyStrokeMode.Contextual
	stroke.Parent = item
	item.Parent = parent
	return item
end

local function draw(button: TextButton)
	local style = buttonStyles[button]
	local state = if not style.enabled
		then "d"
		elseif style.down then "p"
		elseif style.hover then "h"
		else "n"
	Kit.paint(button:FindFirstChild("Skin") :: ImageLabel, "btn-" .. style.color .. "-" .. state)
end

function Kit.button(
	parent: Instance,
	name: string,
	size: UDim2,
	at: UDim2,
	color: string,
	anchor: Vector2?,
	icon: string?
): TextButton
	local b = Instance.new("TextButton")
	b.Name, b.Size, b.Position, b.AnchorPoint = name, size, at, anchor or Vector2.zero
	b.BackgroundTransparency, b.Text, b.AutoButtonColor = 1, "", false
	local min = Instance.new("UISizeConstraint")
	min.MinSize, min.Parent = Vector2.new(44, 44), b
	Kit.image(b, "Skin", UDim2.fromScale(1, 1), UDim2.fromOffset(0, 0), "btn-" .. color .. "-n")
	if icon then
		Kit.image(
			b,
			"Icon",
			UDim2.fromOffset(22, 22),
			UDim2.fromScale(0.5, 0.5),
			icon,
			Vector2.new(0.5, 0.5)
		)
	end
	Kit.label(b, "Caption", UDim2.new(1, -10, 1, -8), UDim2.fromOffset(5, 4), 15, true)
	buttonStyles[b] = { color = color, enabled = true, down = false, hover = false }
	local style = buttonStyles[b]
	b.MouseEnter:Connect(function()
		style.hover = true
		draw(b)
	end)
	b.MouseLeave:Connect(function()
		style.hover, style.down = false, false
		draw(b)
	end)
	b.InputBegan:Connect(function(input)
		if
			input.UserInputType == Enum.UserInputType.Touch
			or input.UserInputType == Enum.UserInputType.MouseButton1
		then
			style.down = true
			draw(b)
		end
	end)
	b.InputEnded:Connect(function(input)
		if
			input.UserInputType == Enum.UserInputType.Touch
			or input.UserInputType == Enum.UserInputType.MouseButton1
		then
			style.down = false
			draw(b)
		end
	end)
	b.Parent = parent
	return b
end

function Kit.caption(button: TextButton, text: string): TextLabel
	local label = button:FindFirstChild("Caption") :: TextLabel
	label.Text = text
	return label
end

function Kit.state(button: TextButton, color: string, enabled: boolean?)
	local style = buttonStyles[button]
	style.color, style.enabled = color, enabled ~= false
	draw(button)
end

function Kit.bar(parent: Instance, name: string, size: UDim2, at: UDim2, color: Color3): Frame
	local rail = Kit.image(parent, name, size, at, "frame-well")
	local fill = Kit.block(rail, "Fill", UDim2.fromScale(0, 1), UDim2.fromOffset(0, 0), color)
	return fill
end

function Kit.number(parent: Instance, size: UDim2, at: UDim2, sprite: string): TextLabel
	Kit.image(parent, "Symbol", UDim2.fromOffset(24, 24), UDim2.new(0, 9, 0.5, -12), sprite)
	return Kit.label(parent, "Number", size, at, 20, true, Kit.gold)
end

function Kit.dial(parent: Instance, at: UDim2): (TextButton, { Frame })
	local dial =
		Kit.button(parent, "MineUltButton", UDim2.fromOffset(66, 66), at, "iron", Vector2.one)
	dial:FindFirstChild("Skin").Visible = false
	local base = Color3.fromRGB(36, 29, 33)
	local rim = Color3.fromRGB(103, 85, 77)
	for y = -7, 7 do
		local radius = math.floor(math.sqrt(60 - y * y))
		local width = (radius * 2 + 1) * 4
		local row = Kit.block(
			dial,
			"Rim",
			UDim2.fromOffset(width, 4),
			UDim2.fromOffset(33 - width / 2, 31 + y * 4),
			rim
		)
		if width > 8 and math.abs(y) < 7 then
			Kit.block(row, "Face", UDim2.new(1, -8, 1, 0), UDim2.fromOffset(4, 0), base)
		end
	end
	local ring = {}
	for i = 1, 28 do
		local a = (i - 1) * 2 * math.pi / 28
		local x = 31 + math.round(math.sin(a) * 25)
		local y = 31 - math.round(math.cos(a) * 25)
		ring[i] = Kit.block(dial, "Charge", UDim2.fromOffset(5, 5), UDim2.fromOffset(x, y), base)
	end
	Kit.image(
		dial,
		"Bolt",
		UDim2.fromOffset(29, 29),
		UDim2.fromScale(0.5, 0.5),
		"i-bolt",
		Vector2.new(0.5, 0.5)
	)
	return dial, ring
end

function Kit.scroll(parent: Instance, name: string, size: UDim2, at: UDim2): ScrollingFrame
	local scroll = Instance.new("ScrollingFrame")
	scroll.Name, scroll.Size, scroll.Position = name, size, at
	scroll.BackgroundTransparency, scroll.BorderSizePixel, scroll.ScrollBarThickness = 1, 0, 4
	scroll.ScrollBarImageColor3 = Kit.gold
	scroll.AutomaticCanvasSize, scroll.CanvasSize = Enum.AutomaticSize.Y, UDim2.fromOffset(0, 0)
	scroll.ScrollingDirection, scroll.Parent = Enum.ScrollingDirection.Y, parent
	return scroll
end

return Kit
