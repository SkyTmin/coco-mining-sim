--!strict
-- Pixel cracks and the block-textured crumb burst from coco-prison-roblox (stage-1).
local Debris = game:GetService("Debris")
local Config = require(game:GetService("ReplicatedStorage").Shared.Config)
local BlockBreak = {}
local STAGES = Config.art.cracks

function BlockBreak.new(parent: Instance): any
	local cracks = {}
	for i = 1, 24 do
		local gui = Instance.new("SurfaceGui")
		gui.Name, gui.SizingMode, gui.CanvasSize =
			"OreCracks", Enum.SurfaceGuiSizingMode.FixedSize, Vector2.new(64, 64)
		gui.ZOffset, gui.LightInfluence = 1, 0.44
		local image = Instance.new("ImageLabel")
		image.Size, image.BackgroundTransparency = UDim2.fromScale(1, 1), 1
		image.ResampleMode, image.Parent = Enum.ResamplerMode.Pixelated, gui
		cracks[i] = { gui = gui, image = image }
	end
	return { parent = parent, cracks = cracks, budget = 48, last = os.clock() }
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
		local progress = if windup
			then windup * 2 - (i - 1) / math.max(1, #front)
			elseif damage then damage.amount / 255
			else 0
		if cell and progress > 0 then
			local stage = math.clamp(math.floor(progress * #STAGES) + 1, 1, #STAGES)
			item.gui.Face = if cell.texture then cell.texture.Face else Enum.NormalId.Back
			item.image.Image, item.image.ImageColor3 = STAGES[stage], tint or Color3.new(1, 1, 1)
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
	texture: string,
	wave: boolean?
)
	local now = os.clock()
	fx.budget = math.min(48, fx.budget + (now - fx.last) * 48)
	fx.last = now
	local wanted = if wave then (if quality == 1 then 2 else 3) elseif breaking then 8 else 2
	local amount = math.min(wanted, math.floor(fx.budget))
	if amount <= 0 then
		return
	end
	fx.budget -= amount

	local holder = Instance.new("Part")
	holder.Name, holder.Size, holder.Transparency =
		"BlockParticles", Vector3.new(size * 0.65, size * 0.65, size * 0.15), 1
	holder.Anchored, holder.CanCollide, holder.CanQuery, holder.CanTouch, holder.CastShadow =
		true, false, false, false, false
	local start = position + direction * (size * 0.48)
	holder.CFrame = CFrame.lookAt(start, start + direction)
	holder.Parent = fx.parent
	local emitter = Instance.new("ParticleEmitter")
	emitter.Texture = texture
	emitter.Color = ColorSequence.new(Color3.new(1, 1, 1):Lerp(color, 0.4))
	emitter.Size = NumberSequence.new(if breaking then 0.45 else 0.30)
	emitter.Lifetime = NumberRange.new(0.25, 0.55)
	emitter.Speed = if breaking then NumberRange.new(5, 11) else NumberRange.new(2, 4)
	emitter.SpreadAngle, emitter.Acceleration = Vector2.new(180, 180), Vector3.new(0, -45, 0)
	emitter.Rotation, emitter.RotSpeed = NumberRange.new(0, 360), NumberRange.new(-180, 180)
	emitter.Drag, emitter.Rate, emitter.LightInfluence = 2, 0, 1
	emitter.Shape, emitter.ShapeStyle =
		Enum.ParticleEmitterShape.Box, Enum.ParticleEmitterShapeStyle.Volume
	emitter.Parent = holder
	emitter:Emit(amount)
	Debris:AddItem(holder, 0.65)
end

return BlockBreak
