--!strict

local ContentProvider = game:GetService("ContentProvider")
local Debris = game:GetService("Debris")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Hash = require(Shared.Mine.Hash)
local BlockBreak = {}
local STAGES = Config.art.cracks
local WHITE = Color3.new(1, 1, 1)

type Faces = { [Enum.NormalId]: Decal }
type Active = { [Part]: Faces }
type Fx = {
	parent: Instance,
	free: { Decal },
	active: Active,
	budget: number,
	last: number,
}

function BlockBreak.new(parent: Instance): Fx
	task.spawn(function()
		local textures = {}
		for _, set in STAGES do
			for _, id in set do
				table.insert(textures, id)
			end
		end
		pcall(ContentProvider.PreloadAsync, ContentProvider, textures)
	end)
	return { parent = parent, free = {}, active = {}, budget = 48, last = os.clock() }
end

local function release(fx: Fx, desired: Active)
	for part, faces in fx.active do
		local keep = desired[part]
		for side, decal in faces do
			if not keep or keep[side] ~= decal then
				decal.Parent = nil
				table.insert(fx.free, decal)
			end
		end
	end
	fx.active = desired
end

function BlockBreak.clear(fx: Fx)
	release(fx, {})
end

local function stageFor(amount: number): number
	return math.clamp(math.ceil(amount * 10 / 255), 0, 10)
end

function BlockBreak.cracks(
	fx: Fx,
	renderer: any,
	win: any,
	keyFor: (number, number, number) -> number,
	windup: number?
)
	local nextActive: Active = {}
	local function paint(cell: any, stage: number)
		if not cell or stage == 0 then
			return
		end
		local part: Part = cell.part
		local previous = fx.active[part]
		local faces: Faces = {}
		for _, face in cell.faces do
			local decal = (previous and previous[face]) or table.remove(fx.free)
			if not decal then
				decal = Instance.new("Decal")
				decal.Name = "OreCrack"
				decal.ZIndex = 2
			end
			local set = 1 + (Hash.u32(cell.x, cell.y, cell.d) + face.Value) % #STAGES
			decal.Face, decal.Texture, decal.Color3 = face, STAGES[set][stage], WHITE
			decal.Transparency = 0
			if decal.Parent ~= part then
				decal.Parent = part
			end
			faces[face] = decal
		end
		nextActive[part] = faces
	end
	if windup then
		local front = {}
		for key, cell in renderer.cells do
			if cell.d == win.front then
				table.insert(front, key)
			end
		end
		table.sort(front)
		for i, key in front do
			local progress = windup * 2 - (i - 1) / math.max(1, #front)
			paint(renderer.cells[key], stageFor(math.clamp(progress * 255, 0, 255)))
		end
	else
		for _, damage in win.damage do
			local depth = win.front + damage.dRel
			paint(renderer.cells[keyFor(damage.x, damage.y, depth)], stageFor(damage.amount))
		end
	end
	release(fx, nextActive)
end

function BlockBreak.hit(
	fx: Fx,
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
