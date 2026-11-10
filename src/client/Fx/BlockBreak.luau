--!strict

local BlockBreak = {}
local rng = Random.new()

local function piece(): Part
	local p = Instance.new("Part")
	p.Anchored, p.CanCollide, p.CanQuery, p.CanTouch, p.CastShadow =
		true, false, false, false, false
	p.Material = Enum.Material.SmoothPlastic
	return p
end

function BlockBreak.new(parent: Instance): any
	local chips, shells, cracks = {}, {}, {}
	for i = 1, 80 do
		chips[i] = { part = piece(), untilAt = 0 }
	end
	for i = 1, 8 do
		shells[i] = { part = piece(), untilAt = 0 }
	end
	for i = 1, 24 do
		local gui = Instance.new("SurfaceGui")
		gui.Face, gui.SizingMode, gui.CanvasSize =
			Enum.NormalId.Back, Enum.SurfaceGuiSizingMode.FixedSize, Vector2.new(100, 100)
		local lines = {}
		for j = 1, 10 do
			local line = Instance.new("Frame")
			line.AnchorPoint, line.BorderSizePixel, line.BackgroundColor3 =
				Vector2.new(0.5, 0.5), 0, Color3.fromRGB(39, 29, 30)
			local angle = j * 2.4
			line.Position =
				UDim2.fromOffset(50 + math.cos(angle) * j * 3, 50 + math.sin(angle) * j * 3)
			line.Size = UDim2.fromOffset(10 + j * 2, 2)
			line.Rotation = math.deg(angle)
			line.Parent = gui
			lines[j] = line
		end
		cracks[i] = { gui = gui, lines = lines }
	end
	return {
		parent = parent,
		chips = chips,
		shells = shells,
		cracks = cracks,
		chipStart = 0,
		chipCount = 0,
	}
end

function BlockBreak.cracks(
	fx: any,
	renderer: any,
	win: any,
	need: (number) -> number,
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
			else damage and renderer.cells[keyFor(damage.x, damage.y, win.front + damage.dRel)]
		item.gui.Parent = if cell then cell.part else nil
		if cell then
			local stage = if windup
				then math.clamp(math.ceil((windup * 2 - (i - 1) / math.max(1, #front)) * 8), 0, 10)
				else math.clamp(
					math.ceil(damage.amount / need(win.front + damage.dRel) * 10),
					1,
					10
				)
			for j, line in item.lines do
				line.Visible = j <= stage
				line.BackgroundColor3 = tint or Color3.fromRGB(39, 29, 30)
			end
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
	toward: Vector3?
)
	local now = os.clock()
	for _, shell in fx.shells do
		if not toward and shell.untilAt <= now then
			local p = shell.part
			p.Size, p.Position, p.Color, p.Transparency, p.Parent =
				Vector3.one * (size * 1.01), position, Color3.new(1, 1, 1), 0.38, fx.parent
			shell.at, shell.untilAt, shell.size = now, now + 0.04, size
			break
		end
	end
	if now - fx.chipStart >= 1 then
		fx.chipStart, fx.chipCount = now, 0
	end
	local requested = if toward then 3 elseif breaking then rng:NextInteger(6, 8) else 2
	local budget = if quality == 1 then 54 else 72
	local maxActive = if quality == 1 then 24 else 40
	local made = 0
	for i = 1, maxActive do
		local chip = fx.chips[i]
		if chip.untilAt <= now and fx.chipCount < budget then
			local p = chip.part
			p.Color, p.Size, p.Position, p.Transparency, p.Parent =
				color, Vector3.one * rng:NextNumber(0.22, 0.57), position, 0, fx.parent
			chip.origin, chip.at, chip.untilAt = position, now, now + rng:NextNumber(0.4, 0.6)
			chip.velocity = Vector3.new(
				rng:NextNumber(-8, 8),
				rng:NextNumber(4, 12),
				rng:NextNumber(-6, 6)
			) + (if toward then toward * rng:NextNumber(16, 30) else Vector3.zero)
			fx.chipCount += 1
			made += 1
			if made >= requested then
				break
			end
		end
	end
end

function BlockBreak.step(fx: any, now: number)
	for _, shell in fx.shells do
		local p = shell.part
		if p.Parent then
			if now >= shell.untilAt then
				p.Parent = nil
			else
				p.Size = Vector3.one
					* (shell.size * (1 - 0.15 * math.clamp((now - shell.at) / 0.04, 0, 1)))
			end
		end
	end
	for _, chip in fx.chips do
		local p = chip.part
		if p.Parent then
			if now >= chip.untilAt then
				p.Parent = nil
			else
				local t = now - chip.at
				p.CFrame = CFrame.new(
					chip.origin + chip.velocity * t - Vector3.new(0, 19 * t * t, 0)
				) * CFrame.Angles(t * 7, t * 11, t * 4)
				p.Transparency = math.clamp((t - 0.24) * 3, 0, 1)
			end
		end
	end
end

return BlockBreak
