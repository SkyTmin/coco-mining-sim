--!strict

local Config = require(game:GetService("ReplicatedStorage").Shared.Config)
local BlockBreak = {}
local rng = Random.new()
local LIFE = 0.35

local function piece(): Part
	local p = Instance.new("Part")
	p.Anchored, p.CanCollide, p.CanQuery, p.CanTouch, p.CastShadow =
		true, false, false, false, false
	p.Material = Enum.Material.SmoothPlastic
	return p
end

function BlockBreak.new(parent: Instance): any
	local chips, cracks = {}, {}
	for i = 1, 48 do
		chips[i] = { part = piece(), untilAt = 0 }
	end
	for i = 1, 24 do
		local gui = Instance.new("SurfaceGui")
		gui.Name, gui.SizingMode, gui.CanvasSize =
			"OreCracks", Enum.SurfaceGuiSizingMode.FixedSize, Vector2.new(16, 16)
		gui.ZOffset, gui.LightInfluence = 1, 0.3
		local image = Instance.new("ImageLabel")
		image.Size, image.BackgroundTransparency = UDim2.fromScale(1, 1), 1
		image.Image, image.ImageRectSize = Config.art.textures.mineFx, Vector2.new(16, 16)
		image.ResampleMode, image.Parent = Enum.ResamplerMode.Pixelated, gui
		cracks[i] = { gui = gui, image = image }
	end
	local flash = piece()
	flash.Name, flash.Material, flash.Color = "PickContact", Enum.Material.Neon, Color3.new(1, 1, 1)
	return {
		parent = parent,
		chips = chips,
		cracks = cracks,
		flash = flash,
		flashFrame = false,
		chipStart = 0,
		chipCount = 0,
	}
end

function BlockBreak.cracks(
	fx: any,
	renderer: any,
	win: any,
	keyFor: (number, number, number) -> number,
	windup: number?,
	tint: Color3?
)
	local front = {}
	if windup then
		for key, cell in renderer.cells do
			if cell.d == win.front then
				table.insert(front, key)
			end
		end
		table.sort(front)
	end
	for i, item in fx.cracks do
		local damage = win.damage[i]
		local cell = if windup
			then renderer.cells[front[i]]
			else damage and damage.dRel < Config.mine.nearWindow and renderer.cells[keyFor(
				damage.x,
				damage.y,
				win.front + damage.dRel
			)]
		local base = cell and cell.primary
		local stage = if windup
			then math.clamp(math.ceil((windup * 2 - (i - 1) / math.max(1, #front)) * 4), 0, 4)
			elseif damage then math.clamp(math.ceil(damage.amount / 255 * 4), 1, 4)
			else 0
		if base and stage > 0 then
			item.gui.Face = base.Face
			item.image.ImageRectOffset = Vector2.new((stage - 1) * 20, 48)
			item.image.ImageColor3 = tint or Color3.new(1, 1, 1)
			item.gui.Parent = cell.part
		else
			item.gui.Parent = nil
		end
	end
end

function BlockBreak.hit(
	fx: any,
	position: Vector3,
	color: Color3,
	size: number,
	breaking: boolean,
	quality: number,
	direction: Vector3,
	wave: boolean?
)
	local now = os.clock()
	if not wave then
		local flash = fx.flash
		flash.Size, flash.CFrame =
			Vector3.one * (size + 0.015), CFrame.lookAt(position, position + direction)
		flash.Parent, fx.flashFrame = fx.parent, true
	end
	if now - fx.chipStart >= 1 then
		fx.chipStart, fx.chipCount = now, 0
	end
	local requested = if wave then 3 elseif breaking then rng:NextInteger(6, 10) else 2
	local budget = if quality == 1 then 54 else 80
	local maxActive = if quality == 1 then 28 else #fx.chips
	local origin = position + (if wave then Vector3.zero else direction * (size * 0.53))
	local across = direction:Cross(Vector3.yAxis)
	local made = 0
	for i = 1, maxActive do
		local chip = fx.chips[i]
		if chip.untilAt <= now and (not wave or fx.chipCount < budget) then
			local p = chip.part
			local start = if wave
				then origin
				else origin
					+ across * rng:NextNumber(-0.13, 0.13) * size
					+ Vector3.yAxis * rng:NextNumber(-0.13, 0.13) * size
			p.Color, p.Size, p.Position, p.Transparency, p.Parent =
				color, Vector3.one * rng:NextNumber(0.17, 0.39), start, 0, fx.parent
			chip.origin, chip.at, chip.untilAt = start, now, now + LIFE
			chip.velocity = Vector3.new(
				rng:NextNumber(-7, 7),
				rng:NextNumber(3, 9),
				rng:NextNumber(-6, 6)
			) + direction * (if wave then rng:NextNumber(16, 30) else 4)
			fx.chipCount += 1
			made += 1
			if made >= requested then
				break
			end
		end
	end
end

function BlockBreak.step(fx: any, now: number)
	if not fx.flashFrame then
		fx.flash.Parent = nil
	end
	fx.flashFrame = false
	for _, chip in fx.chips do
		local p = chip.part
		if p.Parent then
			if now >= chip.untilAt then
				p.Parent = nil
			else
				local t = math.max(0, now - chip.at)
				p.CFrame = CFrame.new(
					chip.origin + chip.velocity * t - Vector3.new(0, 19 * t * t, 0)
				) * CFrame.Angles(t * 7, t * 11, t * 4)
				p.Transparency = math.clamp((t - 0.20) / (LIFE - 0.20), 0, 1)
			end
		end
	end
end

return BlockBreak
