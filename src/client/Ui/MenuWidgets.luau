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
-- [владелец 13.11: «при переключении семей сначала появляются другие кирки, потом нужные»] the cause: one
-- ViewportFrame per image had its model swapped; until the new cel meshes reach the renderer the frame keeps showing
-- its last picture — the previous family's pick over the new stage. Now every pick gets its own ViewportFrame under
-- the image, built once and kept; switching only flips Visible, so a wrong pick can never show (at worst one empty
-- frame on the very first look at a pick).
local INK_SILHOUETTE = Color3.fromHex("2A2540")
-- The second cause, found by tapping families fast: the first build of a pick's meshes waits on
-- AssetService (CreateEditableMeshAsync / CreateMeshPartAsync), so a refresh could pause here while a newer one ran;
-- the older then woke up and painted its family over the newer. The image remembers the pick it wants now
-- (WantPick) and a late result for another pick leaves it alone.
local function celIcon(image: ImageLabel, id: string, zoom: number?): boolean
	local template = CelPicks.template(id)
	if image:GetAttribute("WantPick") ~= id then
		return true -- a newer request took this image while the meshes were being built
	end
	if not template then
		for _, child in image:GetChildren() do
			if child:IsA("ViewportFrame") and child:GetAttribute("Pick") then
				child.Visible = false
			end
		end
		return false
	end
	local name = "CelIcon_" .. id
	local view = image:FindFirstChild(name) :: ViewportFrame?
	if not view then
		local frame = Instance.new("ViewportFrame")
		frame.Name, frame.BackgroundTransparency, frame.Size = name, 1, UDim2.fromScale(1, 1)
		frame.LightDirection, frame.Ambient, frame.LightColor =
			Vector3.new(1, -1, 0.6), Color3.fromRGB(215, 215, 220), Color3.fromRGB(255, 250, 240)
		frame:SetAttribute("Pick", id)
		local model = CelMesh.clone(template)
		-- the aura is particles and trails, which a ViewportFrame does not draw; its invisible holder parts only
		-- made the framing wrong (the pick came out small and off-centre). The stage behind draws the sparkle.
		for _, part in model:GetChildren() do
			if part.Name == "CelAura" or part.Name == "CelMote" then
				part:Destroy()
			end
		end
		model.Parent = frame
		-- centre the real mesh bounds on the origin (the template pivot is not reliably the grip here)
		local box = model:GetBoundingBox()
		model:PivotTo(model:GetPivot() - box.Position)
		local camera = Instance.new("Camera")
		camera.FieldOfView = 30
		local size = model:GetExtentsSize()
		-- fit both ways: the screen's vertical is model Y, its horizontal model Z; a narrow window limits the width
		local function place()
			local px = image.AbsoluteSize
			local aspect = if px.Y > 0 then px.X / px.Y else 1
			local half = math.tan(math.rad(15))
			local k = 0.54 / (zoom or 1)
			local fit = math.max(size.Y * k / half, size.Z * k / (half * math.min(aspect, 1)))
			camera.CFrame = CFrame.lookAt(Vector3.new(-fit - size.X * 0.5, 0, 0), Vector3.zero)
		end
		place()
		image:GetPropertyChangedSignal("AbsoluteSize"):Connect(place)
		camera.Parent = frame
		frame.CurrentCamera = camera
		frame.Parent = image
		view = frame
	end
	for _, child in image:GetChildren() do
		if child:IsA("ViewportFrame") and child:GetAttribute("Pick") then
			child.Visible = child == view
		end
	end
	local frame = view :: ViewportFrame
	-- a pick the player has not found yet is a dark silhouette: the shape is a promise, the colours a reward
	local missing = image:GetAttribute("Silhouette") == true
	frame.ImageColor3 = if missing then INK_SILHOUETTE else Color3.new(1, 1, 1)
	frame.ImageTransparency = if missing then 0.15 else image.ImageTransparency
	image.Image = ""
	return true
end

-- `zoom` > 1 crops into the pick (small grid cells: the head reads, the handle end may leave the frame)
function Widgets.pickIcon(image: ImageLabel, id: string, zoom: number?)
	image:SetAttribute("WantPick", id)
	Candy.setIcon(image, "pickaxe")
	if celIcon(image, id, zoom) then
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

-- builds every pick's cel template in the background, a frame apart, so the menu never waits on a first build
local warmed = false
function Widgets.warmPicks(ids: { string })
	if warmed then
		return
	end
	warmed = true
	task.spawn(function()
		for _, id in ids do
			CelPicks.template(id)
			task.wait()
		end
	end)
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

-- ── one grid for every menu page [владелец 12.11: «пройдись по всему меню… неровно, негармонично»] ─────────────
-- page = a header row (HEAD of the height: a title or tabs on the left, switches on the right; it stops CLOSE units
-- short of the window's close button) and the body below it (from BODY), always with GAP between things
Widgets.GAP = 8
Widgets.HEAD = 0.13
Widgets.BODY = 0.13 + 0.035
Widgets.CLOSE = 30
-- items (cards) sit further apart than controls, so each reads as its own object [владелец 13.11: «слиплись»]
Widgets.CARD_GAP = 12

-- lays the given boxes side by side inside their parent: equal shares (or weights), GAP between, flush at both ends
function Widgets.row(boxes: { GuiObject }, y: UDim, h: UDim, weights: { number }?, gap: number?)
	local g = gap or Widgets.GAP
	local sum = 0
	for index in boxes do
		sum += if weights then weights[index] else 1
	end
	local x = 0
	local n = #boxes
	for index, box in boxes do
		local w = (if weights then weights[index] else 1) / sum
		-- every box gives up the same share of the gaps, so all keep their exact proportion
		Candy.fit(
			box,
			UDim2.new(w, -g * (n - 1) * w, h.Scale, h.Offset),
			UDim2.new(x, g * (index - 1) - g * (n - 1) * x, y.Scale, y.Offset)
		)
		x += w
	end
end

export type UpgradeCard = {
	box: Frame,
	surface: Frame,
	band: Frame,
	circle: Frame,
	icon: ImageLabel,
	name: TextLabel,
	level: TextLabel,
	value: TextLabel,
	buy: Candy.Control,
	locked: Candy.Control,
}

-- the one upgrade card of the menu (cards of the circle, family skills): a coloured band with the icon, the name, the
-- level, «before → after» and the buy button at the bottom; the same shares in every card
function Widgets.upgradeCard(
	parent: Instance,
	name: string,
	color: Color3,
	iconKey: string
): UpgradeCard
	local box, surface = Candy.panel(parent, name, scale(0.25, 1), scale(0, 0))
	local band = Widgets.band(box, "Header", UDim2.new(1, -4, 0.34, -2), color)
	local circle, icon = Widgets.iconCircle(box, iconKey, scale(0.62, 0.27), scale(0.5, 0.17))
	circle.AnchorPoint = Vector2.new(0.5, 0.5)
	local title = Candy.text(box, "Name", scale(0.92, 0.12), scale(0.04, 0.36), 17)
	local level = Candy.text(box, "Level", scale(0.92, 0.08), scale(0.04, 0.48), 13)
	level.TextColor3 = Color3.fromHex("6B6F8C")
	local value = Candy.text(box, "Value", scale(0.92, 0.1), scale(0.04, 0.575), 15)
	local buy =
		Candy.button(box, "Buy", UDim2.new(1, -12, 0.22, 0), UDim2.new(0, 6, 0.74, 0), "coin", 17)
	Candy.buttonIcon(buy, "coin")
	local locked = Candy.button(
		box,
		"Locked",
		UDim2.new(1, -12, 0.22, 0),
		UDim2.new(0, 6, 0.74, 0),
		"neutral",
		12
	)
	locked.shadow.Visible = false
	locked.face.BackgroundTransparency = 1
	local outline = locked.face:FindFirstChildOfClass("UIStroke")
	if outline then
		outline.Enabled = false
	end
	Widgets.dashes(locked.face)
	Candy.buttonIcon(locked, "lock")
	locked.box.Visible = false
	return {
		box = box,
		surface = surface,
		band = band,
		circle = circle,
		icon = icon,
		name = title,
		level = level,
		value = value,
		buy = buy,
		locked = locked,
	}
end

-- a navigation tab: the selected one is a solid white pill with the ink outline and the shadow; the others are only
-- their label on the panel — so the eye reads one «you are here» and the content, not a wall of equal buttons
function Widgets.tab(button: Candy.Control, selected: boolean)
	Candy.paint(button, "neutral")
	button.flat = not selected
	button.shadow.Visible = selected and not button.pressed
	local stroke = button.face:FindFirstChildOfClass("UIStroke")
	if stroke then
		stroke.Transparency = if selected then 0 else 1
	end
	button.face.BackgroundColor3 = Color3.new(1, 1, 1)
	button.face.BackgroundTransparency = if selected then 0 else 1
	button.text.TextColor3 = if selected then Candy.ink else Color3.fromHex("6A6480")
	button.image.ImageTransparency = if selected then 0 else 0.3
end

return Widgets
