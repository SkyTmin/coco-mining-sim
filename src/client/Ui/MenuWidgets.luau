--!strict
local TweenService = game:GetService("TweenService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Sfx = require(Shared.Sfx)
local ProfileState = require(script.Parent.Parent.ProfileState)
local Candy = require(script.Parent.Candy)
local CelMesh = require(script.Parent.Parent.Fx.CelMesh)
local CelPicks = require(script.Parent.Parent.Fx.CelPicks)

local Widgets = {}
local offset, scale = UDim2.fromOffset, UDim2.fromScale

Widgets.blue = Color3.fromHex("3D8BFF")
Widgets.yellow = Color3.fromHex("FFC83D")
Widgets.green = Color3.fromHex("22C55E")
Widgets.navy = Color3.fromHex("28337A")
Widgets.familyColors = {
	storm = Color3.fromHex("45CFFF"),
	dynamite = Color3.fromHex("FF6A2A"),
	rift = Color3.fromHex("FFA51C"),
	frost = Color3.fromHex("BDEFFF"),
}
Widgets.rarityColors = {
	starter = Color3.fromHex("B58350"),
	common = Color3.fromHex("A9B4C2"),
	rare = Color3.fromHex("3FA9FF"),
	epic = Color3.fromHex("A35BFF"),
	legendary = Color3.fromHex("FF9F1C"),
}
Widgets.rarityText = {
	starter = Color3.fromHex("7D4D25"),
	common = Color3.fromHex("536075"),
	rare = Color3.fromHex("1F6FC2"),
	epic = Color3.fromHex("7032BF"),
	legendary = Color3.fromHex("995400"),
}

export type Context = {
	player: Player,
	t: (string, ...any) -> string,
	feedback: (string, number) -> (),
	hint: Frame,
	hintText: TextLabel,
	hintOwner: TextButton?,
}

function Widgets.context(
	panel: Frame,
	player: Player,
	translate: (string, ...any) -> string,
	feedback: (string, number) -> ()
): Context
	local hint = Candy.panel(panel, "HoldHint", UDim2.new(0.58, 0, 0, 52), scale(0.5, 0.97))
	hint.ZIndex, hint.AnchorPoint, hint.Visible = 9, Vector2.new(0.5, 1), false
	local hintText = Candy.text(hint, "Hint", scale(0.93, 0.86), scale(0.035, 0.07), 15)
	return { player = player, t = translate, feedback = feedback, hint = hint, hintText = hintText }
end

function Widgets.hideHint(ctx: Context)
	ctx.hintOwner, ctx.hint.Visible = nil, false
end

function Widgets.click()
	-- The Candy sound atlas calls its soft UI click ui_tap.
	Sfx.play("ui_tap", 0.36)
end

function Widgets.bind(
	ctx: Context,
	button: Candy.Control,
	activate: () -> (),
	describe: (() -> string?)?
)
	local press = 0
	local held = false
	if describe then
		button.input.InputBegan:Connect(function(input)
			if not Candy.pointer(input) then
				return
			end
			press += 1
			held = false
			local stamp = press
			task.delay(0.45, function()
				if press ~= stamp or input.UserInputState == Enum.UserInputState.End then
					return
				end
				local text = describe()
				if text and text ~= "" then
					held = true
					ctx.hintOwner, ctx.hintText.Text, ctx.hint.Visible = button.input, text, true
				end
			end)
		end)
		local function release()
			press += 1
			if ctx.hintOwner == button.input then
				Widgets.hideHint(ctx)
			end
		end
		button.input.InputEnded:Connect(function(input)
			if Candy.pointer(input) then
				release()
			end
		end)
		button.input.MouseLeave:Connect(release)
	end
	button.input.Activated:Connect(function(input)
		if held and Candy.pointer(input) then
			held = false
			return
		end
		Widgets.hideHint(ctx)
		Widgets.click()
		activate()
	end)
end

function Widgets.lift(button: Candy.Control)
	local base: UDim2? = nil
	local tween: Tween? = nil
	local function move(target: UDim2)
		if tween then
			tween:Cancel()
		end
		tween = TweenService:Create(button.box, TweenInfo.new(0.12), { Position = target })
		tween:Play()
	end
	button.input.MouseEnter:Connect(function()
		if not base and not ProfileState.preference("reducedMotion") then
			base = button.box.Position
			move(base - offset(0, 4))
		end
	end)
	button.input.MouseLeave:Connect(function()
		if base then
			move(base)
			base = nil
		end
	end)
end

function Widgets.tone(button: Candy.Control, color: Color3, textColor: Color3?)
	Candy.paint(button, "neutral")
	button.face.BackgroundColor3 = color
	button.text.TextColor3 = textColor or Candy.ink
end

function Widgets.bump(target: GuiObject, ctx: Context, sound: boolean?)
	if sound then
		local now = os.clock()
		ctx.feedback("buy", now)
		Sfx.play("coin", 0.55)
	end
	if ProfileState.preference("reducedMotion") then
		return
	end
	local prior = target:FindFirstChild("BuyBump")
	if prior then
		prior:Destroy()
	end
	local zoom = Instance.new("UIScale")
	zoom.Name, zoom.Parent = "BuyBump", target
	local rise =
		TweenService:Create(zoom, TweenInfo.new(0.1, Enum.EasingStyle.Quad), { Scale = 1.15 })
	local settle =
		TweenService:Create(zoom, TweenInfo.new(0.16, Enum.EasingStyle.Quad), { Scale = 1 })
	rise.Completed:Once(function(state)
		if state == Enum.PlaybackState.Completed and zoom.Parent then
			settle:Play()
		end
	end)
	settle.Completed:Once(function()
		zoom:Destroy()
	end)
	rise:Play()
end

function Widgets.scroll(parent: Instance, name: string, size: UDim2, at: UDim2): ScrollingFrame
	local view = Instance.new("ScrollingFrame")
	view.Name, view.BackgroundTransparency, view.BorderSizePixel = name, 1, 0
	view.ScrollBarThickness, view.ScrollBarImageColor3 = 4, Candy.ink
	view.ScrollingDirection, view.AutomaticCanvasSize =
		Enum.ScrollingDirection.Y, Enum.AutomaticSize.Y
	view.CanvasSize = offset(0, 0)
	Candy.fit(view, size, at)
	view.Parent = parent
	return view
end

function Widgets.band(parent: Instance, name: string, size: UDim2, color: Color3): Frame
	local band = Candy.frame(parent, name, size, offset(2, 2), color)
	Candy.round(band, 10)
	return band
end

function Widgets.iconCircle(
	parent: Instance,
	key: string,
	size: UDim2,
	at: UDim2
): (Frame, ImageLabel)
	local plate = Candy.frame(parent, "IconCircle", size, at, Candy.panelColor)
	Candy.round(plate, 0)
	Candy.stroke(plate, 2)
	local aspect = Instance.new("UIAspectRatioConstraint")
	aspect.Parent = plate
	return plate, Candy.icon(plate, key, scale(0.76, 0.76), scale(0.12, 0.12))
end

function Widgets.pill(
	parent: Instance,
	name: string,
	size: UDim2,
	at: UDim2,
	color: Color3,
	font: number
): (Frame, TextLabel)
	local box = Candy.frame(parent, name, size, at, color)
	Candy.round(box, 8)
	Candy.stroke(box, 2)
	return box, Candy.text(box, "Label", scale(0.94, 0.90), scale(0.03, 0.05), font)
end

function Widgets.badge(parent: Instance, color: Color3): (Frame, TextLabel)
	local badge, label =
		Widgets.pill(parent, "Badge", offset(26, 26), UDim2.new(1, -22, 0, -5), color, 14)
	Candy.round(badge, 0)
	badge.Visible = false
	return badge, label
end

-- [владелец 11.11: «обнови кирки иконки»] the cel model itself in a ViewportFrame over the icon slot
local function celIcon(image: ImageLabel, id: string): boolean
	local template = CelPicks.template(id)
	local view = image:FindFirstChild("CelIcon") :: ViewportFrame?
	if not template then
		if view then
			view:Destroy()
		end
		return false
	end
	if not view then
		local frame = Instance.new("ViewportFrame")
		frame.Name, frame.BackgroundTransparency, frame.Size = "CelIcon", 1, UDim2.fromScale(1, 1)
		frame.LightDirection, frame.Ambient =
			Vector3.new(-1, -1, -0.4), Color3.fromRGB(200, 200, 200)
		local camera = Instance.new("Camera")
		camera.FieldOfView = 30
		camera.Parent = frame
		frame.CurrentCamera = camera
		frame.Parent = image
		image:GetPropertyChangedSignal("ImageTransparency"):Connect(function()
			frame.ImageTransparency = image.ImageTransparency
		end)
		view = frame
	end
	local frame = view :: ViewportFrame
	if frame:GetAttribute("Pick") ~= id then
		frame:SetAttribute("Pick", id)
		frame:ClearAllChildren()
		local model = CelMesh.clone(template)
		model:PivotTo(CFrame.new(-CelPicks.bodyCentre(template, 1)))
		model.Parent = frame
		local camera = Instance.new("Camera")
		camera.FieldOfView = 30
		-- the blade faces −X in the pickaxe frame; frame the whole model with its effects
		local size = model:GetExtentsSize()
		local fit = math.max(size.Y, size.Z) * 0.5 / math.tan(math.rad(15)) + size.X
		camera.CFrame = CFrame.lookAt(Vector3.new(-fit, 0, 0), Vector3.zero)
		camera.Parent = frame
		frame.CurrentCamera = camera
		CelMesh.animate(model)
	end
	frame.ImageTransparency = image.ImageTransparency
	image.Image = ""
	return true
end

function Widgets.pickIcon(image: ImageLabel, id: string)
	Candy.setIcon(image, "pickaxe")
	if celIcon(image, id) then
		return
	end
	local art = Config.art.pickaxes[id]
	if art.placeholder then
		image.ImageColor3 = Candy.white:Lerp(Color3.fromHex(art.color), 0.5)
	else
		image.Image, image.ImageRectSize, image.ImageRectOffset =
			art.icon, Vector2.zero, Vector2.zero
	end
end

function Widgets.pickName(t: (string, ...any) -> string, id: string): string
	local family = Config.pickaxes[id].family
	return t(if family then "family_" .. family else "pick_starter")
end

function Widgets.stars(rarity: string): string
	return string.rep("★", Config.progress.rarities[rarity].stars)
end

function Widgets.dashes(parent: Frame)
	for index = 0, 6 do
		for _, y in { 0, 1 } do
			local dash = Candy.frame(
				parent,
				"Dash",
				UDim2.new(0.092, 0, 0, 2),
				UDim2.new(0.05 + index * 0.135, 0, y, if y == 0 then 1 else -2),
				Candy.ink
			)
			Candy.round(dash, 2)
		end
	end
	for index = 0, 3 do
		for _, x in { 0, 1 } do
			local dash = Candy.frame(
				parent,
				"Dash",
				UDim2.new(0, 2, 0.13, 0),
				UDim2.new(x, if x == 0 then 1 else -2, 0.08 + index * 0.23, 0),
				Candy.ink
			)
			Candy.round(dash, 2)
		end
	end
end

return Widgets
