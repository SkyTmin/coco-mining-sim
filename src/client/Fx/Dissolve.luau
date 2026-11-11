--!strict
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Rules = require(Shared.Mine.DissolveRules)
local GrainPool = require(Shared.Mine.GrainPool)

local Dissolve = {}
export type Block = {
	frame: CFrame,
	texture: string,
	faces: { Enum.NormalId },
	x: number,
	y: number,
	depth: number,
}
export type Fx = {
	root: Part,
	emitters: { ParticleEmitter },
	slots: { { emitter: ParticleEmitter, attachment: Attachment } },
	allocator: GrainPool.Bank,
	bursts: { any },
	living: { number },
	head: number,
	tail: number,
	reserved: number,
	admitted: number,
	emitted: number,
	shift: number,
	velocity: Vector3,
	acceleration: Vector3,
	peak: number,
	peakEmit: number,
	dropped: number,
}
local directions = {
	[Enum.NormalId.Back] = { Vector3.xAxis, -Vector3.yAxis },
	[Enum.NormalId.Front] = { -Vector3.xAxis, -Vector3.yAxis },
	[Enum.NormalId.Right] = { -Vector3.zAxis, -Vector3.yAxis },
	[Enum.NormalId.Left] = { Vector3.zAxis, -Vector3.yAxis },
	[Enum.NormalId.Top] = { Vector3.xAxis, Vector3.zAxis },
	[Enum.NormalId.Bottom] = { Vector3.xAxis, -Vector3.zAxis },
}
function Dissolve.new(parent: Instance): Fx
	local folder = Instance.new("Folder")
	folder.Name = "GrainEmitters"
	folder.Parent = parent
	local root = Instance.new("Part")
	root.Name, root.Anchored, root.Transparency = "GrainSource", true, 1
	root.CanCollide, root.CanQuery, root.CanTouch, root.CastShadow = false, false, false, false
	root.Size = Vector3.one * 0.1
	root.Parent = folder
	local emitters, slots = {}, {}
	for i = 1, Rules.pool do
		local a = Instance.new("Attachment")
		a.Name = "Grain_" .. i
		a.Parent = root
		local e = Instance.new("ParticleEmitter")
		e.Name, e.Texture, e.Rate = "Grain", Config.art.dustTexture, 0
		e.Size = NumberSequence.new({
			NumberSequenceKeypoint.new(0, Rules.size),
			NumberSequenceKeypoint.new(Rules.shrinkAt - 0.0001, Rules.size),
			NumberSequenceKeypoint.new(Rules.shrinkAt, Rules.smallSize),
			NumberSequenceKeypoint.new(1, Rules.smallSize),
		})
		e.Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0),
			NumberSequenceKeypoint.new(Rules.fadeAt, 0),
			NumberSequenceKeypoint.new(1, 1),
		})
		e.Lifetime = NumberRange.new(Rules.lifeMin, Rules.lifeMax)
		e.Speed = NumberRange.new(Rules.speedMin, Rules.speedMax)
		e.SpreadAngle = Vector2.new(360, 360)
		e.Rotation, e.RotSpeed = NumberRange.new(0), NumberRange.new(0)
		e.Orientation = Enum.ParticleOrientation.FacingCamera
		e.LightInfluence, e.LightEmission, e.Brightness = 0, 0, 1
		e.Squash = NumberSequence.new(0)
		e.Drag, e.Acceleration = Rules.drag, Vector3.new(0, Rules.rise * Rules.relax, 0)
		e.WindAffectsDrag, e.LockedToPart, e.VelocityInheritance = false, false, 1
		e.Parent = a
		emitters[i] = e
		slots[i] = { emitter = e, attachment = a }
	end
	return {
		root = root,
		emitters = emitters,
		slots = slots,
		allocator = GrainPool.new(Rules.pool),
		bursts = {},
		living = {},
		head = 1,
		tail = 0,
		reserved = 0,
		admitted = 0,
		emitted = 0,
		shift = 0,
		velocity = Vector3.zero,
		acceleration = Vector3.zero,
		peak = 0,
		peakEmit = 0,
		dropped = 0,
	}
end
function Dissolve.clear(fx: Fx)
	for _, e in fx.emitters do
		e:Clear()
	end
	GrainPool.clear(fx.allocator)
	table.clear(fx.bursts)
	table.clear(fx.living)
	fx.head, fx.tail, fx.reserved = 1, 0, 0
	fx.admitted, fx.emitted, fx.velocity = 0, 0, Vector3.zero
end
function Dissolve.begin(fx: Fx, now: number, shift: number, axis: Vector3, dt: number)
	while fx.living[fx.head] and now >= fx.living[fx.head] do
		fx.living[fx.head] = nil
		fx.head += 1
	end
	if fx.head > fx.tail then
		table.clear(fx.living)
		fx.head, fx.tail = 1, 0
	end
	dt = math.max(dt, 0.001)
	local velocity = axis * ((shift - fx.shift) / dt)
	-- Transform physical particle motion into the mine's moving coordinate frame.
	local acceleration = Vector3.new(0, Rules.rise * Rules.relax, 0)
		+ (velocity - fx.velocity) / dt
		+ velocity * Rules.relax
	fx.root.AssemblyLinearVelocity = velocity
	if acceleration ~= fx.acceleration then
		for _, e in fx.emitters do
			e.Acceleration = acceleration
		end
		fx.acceleration = acceleration
	end
	fx.shift, fx.velocity, fx.admitted, fx.emitted = shift, velocity, 0, 0
	GrainPool.begin(fx.allocator, now)
end

function Dissolve.block(
	fx: Fx,
	block: Block,
	at: number,
	hit: Vector3,
	reduced: boolean,
	ultimate: boolean?
): number
	local camera = workspace.CurrentCamera
	if not camera then
		return 0
	end
	local grain = Config.art.grains.textures[block.texture]
	if not grain then
		return 0
	end
	local faces = {}
	for _, face in block.faces do
		local normal = block.frame:VectorToWorldSpace(Vector3.FromNormalId(face))
		local center = block.frame.Position + normal * 2.5
		if normal:Dot(camera.CFrame.Position - center) > 0 then
			table.insert(faces, face)
			if #faces == 3 then
				break
			end
		end
	end
	-- The ultimate requests sixteen grains per block. Pick the most directly facing face.
	if ultimate and #faces > 1 then
		table.sort(faces, function(a, b)
			local eye = block.frame:PointToObjectSpace(camera.CFrame.Position)
			return Vector3.FromNormalId(a):Dot(eye) > Vector3.FromNormalId(b):Dot(eye)
		end)
		faces = { faces[1] }
	end
	local alive = fx.tail - fx.head + 1
	local available =
		math.min(Rules.maxParticles - alive - fx.reserved, Rules.maxEmit - fx.admitted)
	local stride = Rules.stride(#faces, available, reduced or ultimate == true)
	if stride == 0 or #faces == 0 then
		return 0
	end
	local events = {}
	for _, face in faces do
		local normal = Vector3.FromNormalId(face)
		local axes = directions[face]
		for j = 0, 7, stride do
			for i = 0, 7, stride do
				local localPoint = normal * (2.5 + Rules.surfaceOffset)
					+ axes[1] * ((i + 0.5) * Rules.size - 2.5)
					+ axes[2] * ((j + 0.5) * Rules.size - 2.5)
				local point = block.frame:PointToWorldSpace(localPoint)
				local noise =
					Rules.noise(block.x * 8 + i / 2, block.y * 8 + j / 2, block.depth + face.Value)
				local index = 1 + (tonumber(grain.cells:sub(j * 8 + i + 1, j * 8 + i + 1), 16) or 0)
				table.insert(events, {
					at = at + Rules.delay((point - hit).Magnitude, noise),
					point = point,
					color = Config.art.grains.palettes[grain.palette][index],
					misses = 0,
				})
			end
		end
	end
	table.sort(events, function(a, b)
		return a.at < b.at
	end)
	fx.reserved += #events
	fx.admitted += #events
	table.insert(fx.bursts, { events = events, reduced = reduced, shift = fx.shift })
	return #events
end
function Dissolve.step(fx: Fx, now: number, axis: Vector3)
	local alive = fx.tail - fx.head + 1
	for i = #fx.bursts, 1, -1 do
		local burst = fx.bursts[i]
		for j = #burst.events, 1, -1 do
			local event = burst.events[j]
			if event.at <= now then
				local index, changed = nil, false
				if fx.emitted < Rules.maxEmit and alive < Rules.maxParticles then
					index, changed = GrainPool.take(fx.allocator, event.color, now)
				end
				if index then
					local slot = fx.slots[index]
					if changed then
						slot.emitter.Color = ColorSequence.new(Color3.fromHex(event.color))
					end
					slot.attachment.WorldPosition = event.point + axis * (fx.shift - burst.shift)
					slot.emitter.Speed = if burst.reduced
						then NumberRange.new(0)
						else NumberRange.new(Rules.speedMin, Rules.speedMax)
					slot.emitter:Emit(1)
					fx.emitted += 1
					fx.tail += 1
					fx.living[fx.tail] = now + Rules.lifeMax
					alive += 1
				else
					event.misses += 1
				end
				if index or event.misses > Rules.waitFrames then
					if not index then
						fx.dropped += 1
					end
					table.remove(burst.events, j)
					fx.reserved -= 1
				end
			end
		end
		if #burst.events == 0 then
			table.remove(fx.bursts, i)
		end
	end
	fx.peak = math.max(fx.peak, alive)
	fx.peakEmit = math.max(fx.peakEmit, fx.emitted)
end
return Dissolve
