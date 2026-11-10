--!strict
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Hash = require(Shared.Mine.Hash)
local Rules = require(Shared.Mine.DissolveRules)

local Dissolve = {}
local WHITE = Color3.new(1, 1, 1)
local DOWN = Vector3.new(0, -4, 0)
type Snapshot =
	{ frame: CFrame, material: string, texture: string, dust: { string }, glow: boolean }
export type Fx = {
	parent: Instance,
	free: { Part },
	shards: { any },
	holders: { any },
	active: { any },
	reservations: { any },
	dustCount: number,
	pending: { any },
	settling: number?,
	storm: Part,
	stormEmitter: ParticleEmitter,
	stormAccum: number,
	last: number,
	stormUntil: number,
}
export type Block = Snapshot

local function part(parent: Instance, name: string): Part
	local p = Instance.new("Part")
	p.Name, p.Anchored, p.Transparency = name, true, 1
	p.CanCollide, p.CanQuery, p.CanTouch, p.CastShadow = false, false, false, false
	p.Material, p.Color = Enum.Material.SmoothPlastic, WHITE
	p.Size = Vector3.one * 0.1
	p.Parent = parent
	return p
end

local function emitter(p: Part): ParticleEmitter
	local e = Instance.new("ParticleEmitter")
	e.Name, e.Texture, e.Rate = "Dust", Config.art.dustTexture, 0
	e.Size = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.35),
		NumberSequenceKeypoint.new(1, 0),
	})
	e.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0),
		NumberSequenceKeypoint.new(0.6, 0),
		NumberSequenceKeypoint.new(1, 1),
	})
	e.Lifetime, e.Speed = NumberRange.new(0.6, 1), NumberRange.new(2, 4)
	e.SpreadAngle, e.Drag = Vector2.new(35, 35), 1.5
	e.Rotation, e.RotSpeed = NumberRange.new(0, 360), NumberRange.new(-180, 180)
	e.LightEmission, e.LightInfluence = 0, 1
	e.EmissionDirection = Enum.NormalId.Front
	e.Parent = p
	return e
end

function Dissolve.new(parent: Instance): Fx
	local storm = part(parent, "DustStorm")
	storm.Size = Vector3.new(18, 10, 1)
	local e = emitter(storm)
	e.Shape, e.ShapeStyle = Enum.ParticleEmitterShape.Box, Enum.ParticleEmitterShapeStyle.Volume
	e.EmissionDirection = Enum.NormalId.Back
	local free = {}
	for i = 1, Rules.ultPieces do
		local p = part(parent, "GhostCube")
		p.Parent = nil
		free[i] = p
	end
	return {
		parent = parent,
		free = free,
		shards = {},
		holders = {},
		active = {},
		reservations = {},
		dustCount = 0,
		pending = {},
		storm = storm,
		stormEmitter = e,
		stormAccum = 0,
		last = os.clock(),
		stormUntil = 0,
	}
end

function Dissolve.clear(fx: Fx)
	for _, shard in fx.shards do
		shard.part.Parent = nil
		table.insert(fx.free, shard.part)
	end
	for _, holder in fx.active do
		holder.ore:Clear()
		holder.rock:Clear()
		holder.part.Parent = nil
		table.insert(fx.holders, holder)
	end
	table.clear(fx.shards)
	table.clear(fx.active)
	table.clear(fx.pending)
	table.clear(fx.reservations)
	fx.stormEmitter:Clear()
	fx.storm.Parent = nil
	fx.dustCount, fx.stormAccum, fx.settling = 0, 0, nil
end

function Dissolve.wind(camera: Vector3, target: Vector3): Vector3
	local difference = target - camera
	local flat = Vector3.new(difference.X, 0, difference.Z)
	local forward = if flat.Magnitude > 0.001 then flat.Unit else Vector3.new(0, 0, -1)
	return (forward + Vector3.new(0, 0.45, 0)).Unit
end

local function reserve(fx: Fx, n: number, now: number, ultimate: boolean): boolean
	local cap = if ultimate then Rules.ultDust else Rules.normalDust
	if fx.dustCount + n > cap then
		return false
	end
	fx.dustCount += n
	table.insert(fx.reservations, { at = now + 1, count = n })
	return true
end

local function emit(
	fx: Fx,
	position: Vector3,
	wind: Vector3,
	dust: { string },
	glow: boolean,
	n: number,
	now: number,
	ultimate: boolean,
	reduced: boolean
)
	if not reserve(fx, n, now, ultimate) then
		return
	end
	local holder
	for _, active in fx.active do
		if
			active.dust == dust
			and active.wind == wind
			and active.glow == glow
			and active.reduced == reduced
		then
			holder = active
			break
		end
	end
	if not holder then
		holder = table.remove(fx.holders)
		if not holder then
			local p = part(fx.parent, "DustSource")
			holder = { part = p, ore = emitter(p), rock = emitter(p) }
		end
		holder.dust, holder.wind, holder.glow, holder.reduced = dust, wind, glow, reduced
		table.insert(fx.active, holder)
	end
	local direction = if reduced then Vector3.new(0, -1, 0) else wind
	holder.part.CFrame = CFrame.lookAt(position, position + direction)
	holder.part.Parent = fx.parent
	holder.acceleration = if reduced then Vector3.new(0, -7, 0) else wind * 7
	holder.at = now + 1.02
	local rock = Color3.fromHex(dust[1])
	local ore = Color3.fromHex(dust[#dust])
	if #dust == 1 then
		local factor = 0.92
			+ 0.16
				* Hash.unit(
					math.floor(position.X * 100),
					math.floor(position.Y * 100),
					math.floor(now * 1000)
				)
		ore = Color3.new(rock.R * factor, rock.G * factor, rock.B * factor)
	end
	for e, color in { [holder.ore] = ore, [holder.rock] = rock } do
		e.Texture, e.Color, e.Acceleration =
			Config.art.dustTexture, ColorSequence.new(color), holder.acceleration
		e.LightEmission = if glow then 0.35 else 0
	end
	local oreCount = if #dust > 1 then math.floor(n * 2 / 3) else math.ceil(n / 2)
	holder.ore:Emit(oreCount)
	holder.rock:Emit(n - oreCount)
end

function Dissolve.dust(
	fx: Fx,
	block: Snapshot,
	now: number,
	wind: Vector3,
	n: number,
	ultimate: boolean,
	reduced: boolean
)
	emit(fx, block.frame.Position, wind, block.dust, block.glow, n, now, ultimate, reduced)
end

function Dissolve.block(
	fx: Fx,
	block: Snapshot,
	at: number,
	wind: Vector3,
	reduced: boolean,
	ultimate: boolean
)
	local cap = if ultimate then Rules.ultPieces else Rules.normalPieces
	if reduced or #fx.shards + Rules.pieces > cap then
		table.insert(fx.pending, {
			block = block,
			at = at,
			wind = wind,
			n = if reduced then Rules.dustReduced else Rules.dustFallback,
			ultimate = ultimate,
			reduced = reduced,
		})
		return
	end
	local positions = {}
	local low, high = math.huge, -math.huge
	for x = -1, 1, 2 do
		for y = -1, 1, 2 do
			for z = -1, 1, 2 do
				local cf = block.frame * CFrame.new(x * 1.25, y * 1.25, z * 1.25)
				local along = cf.Position:Dot(wind)
				low, high = math.min(low, along), math.max(high, along)
				table.insert(positions, { cf = cf, along = along, x = x, y = y, z = z })
			end
		end
	end
	local camera = workspace.CurrentCamera
	local toCamera = block.frame:PointToObjectSpace(
		if camera then camera.CFrame.Position else block.frame.Position + block.frame.ZVector * 10
	)
	local axis = if math.abs(toCamera.X) > math.max(math.abs(toCamera.Y), math.abs(toCamera.Z))
		then 1
		elseif math.abs(toCamera.Y) > math.abs(toCamera.Z) then 2
		else 3
	for i, slot in positions do
		local p = assert(table.remove(fx.free))
		p.MaterialVariant, p.Color, p.Transparency = block.material, WHITE, 0
		p.Size, p.CFrame, p.Parent = Vector3.one * Rules.pieceSize, slot.cf, fx.parent
		-- MaterialVariant restarts UVs on a half cube. Preserve quarters on the camera-facing outer side.
		local faces = {
			{
				face = if slot.x > 0 then Enum.NormalId.Right else Enum.NormalId.Left,
				u = -slot.x * slot.z,
				v = slot.y,
			},
			{
				face = if slot.y > 0 then Enum.NormalId.Top else Enum.NormalId.Bottom,
				u = slot.x,
				v = -slot.y * slot.z,
			},
			{
				face = if slot.z > 0 then Enum.NormalId.Back else Enum.NormalId.Front,
				u = slot.z * slot.x,
				v = slot.y,
			},
		}
		for n, face in faces do
			local texture = p:FindFirstChild("Quarter" .. n) :: Texture?
			if not texture then
				texture = Instance.new("Texture")
				texture.Name, texture.Parent = "Quarter" .. n, p
			end
			texture.Face, texture.Texture = face.face, block.texture
			texture.StudsPerTileU, texture.StudsPerTileV = 5, 5
			texture.OffsetStudsU = if face.u > 0 then 2.5 else 0
			texture.OffsetStudsV = if face.v > 0 then 0 else 2.5
			local outward = Vector3.FromNormalId(face.face)
			texture.Color3 = WHITE
			texture.Transparency = if n == axis and outward:Dot(toCamera) > 0 then 0 else 1
		end
		local axis = Vector3.new(
			Hash.unit(i, at, 1) - 0.5,
			Hash.unit(i, at, 2) - 0.5,
			Hash.unit(i, at, 3) - 0.5
		)
		axis = if axis.Magnitude > 0.001 then axis.Unit else Vector3.yAxis
		table.insert(fx.shards, {
			part = p,
			frame = slot.cf,
			at = at + Rules.delay * (slot.along - low) / math.max(0.001, high - low),
			wind = wind,
			axis = axis,
			block = block,
			emitted = false,
			ultimate = ultimate,
		})
	end
end

function Dissolve.settle(fx: Fx, now: number)
	fx.settling = now
	fx.stormUntil = now + 1.02
end

function Dissolve.step(fx: Fx, now: number, stormFrame: CFrame?, stormDust: { string }?)
	for i = #fx.reservations, 1, -1 do
		local r = fx.reservations[i]
		if now >= r.at then
			fx.dustCount -= r.count
			table.remove(fx.reservations, i)
		end
	end
	local settling = if fx.settling then math.clamp((now - fx.settling) / 0.5, 0, 1) else 0
	for i = #fx.active, 1, -1 do
		local h = fx.active[i]
		if now >= h.at then
			h.ore:Clear()
			h.rock:Clear()
			h.part.Parent = nil
			table.insert(fx.holders, h)
			table.remove(fx.active, i)
		elseif fx.settling then
			h.ore.Acceleration = h.acceleration:Lerp(DOWN, settling)
			h.rock.Acceleration = h.ore.Acceleration
		end
	end
	for i = #fx.pending, 1, -1 do
		local r = fx.pending[i]
		if now >= r.at then
			emit(
				fx,
				r.block.frame.Position,
				r.wind,
				r.block.dust,
				r.block.glow,
				r.n,
				now,
				r.ultimate,
				r.reduced
			)
			table.remove(fx.pending, i)
		end
	end
	for i = #fx.shards, 1, -1 do
		local shard = fx.shards[i]
		local age = now - shard.at
		if age >= 0 then
			if not shard.emitted then
				emit(
					fx,
					shard.frame.Position,
					shard.wind,
					shard.block.dust,
					shard.block.glow,
					Rules.dustPerPiece,
					now,
					shard.ultimate,
					false
				)
				shard.emitted = true
			end
			local t = Rules.sample(age)
			if t >= 1 then
				shard.part.Parent = nil
				table.insert(fx.free, shard.part)
				table.remove(fx.shards, i)
			else
				shard.part.Size = Vector3.one * math.max(0.001, Rules.pieceSize * (1 - t * t))
				shard.part.CFrame = CFrame.new(shard.frame.Position + shard.wind * Rules.travel * t)
					* shard.frame.Rotation
					* CFrame.fromAxisAngle(shard.axis, Rules.angle * t)
			end
		end
	end
	local dt = math.clamp(now - fx.last, 0, 0.1)
	fx.last = now
	if stormFrame and stormDust then
		fx.settling = nil
		fx.storm.CFrame, fx.storm.Parent = stormFrame, fx.parent
		fx.stormEmitter.Color =
			ColorSequence.new(Color3.fromHex(stormDust[1]), Color3.fromHex(stormDust[#stormDust]))
		fx.stormEmitter.Acceleration = (
			-stormFrame.LookVector
			+ stormFrame.RightVector * 0.45
			+ Vector3.yAxis * 0.25
		).Unit * 7
		fx.stormAccum += dt * Rules.stormRate
		local n = math.floor(fx.stormAccum)
		if n > 0 then
			fx.stormAccum -= n
			if reserve(fx, n, now, true) then
				fx.stormEmitter:Emit(n)
			end
		end
	elseif fx.settling then
		fx.stormEmitter.Acceleration = fx.stormEmitter.Acceleration:Lerp(DOWN, settling)
		if now > fx.stormUntil then
			fx.storm.Parent = nil
		end
	end
end
return Dissolve
