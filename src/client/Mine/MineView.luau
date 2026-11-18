--!strict
-- One ordered window stream, one wall and one effect pool per visible plot.
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local State = require(Shared.Mine.MineState)
local Worlds = require(Shared.Mine.Worlds)
local Ride = require(Shared.Mine.Ride)
local Wall = require(script.Parent.WallRenderer)
local Aim = require(script.Parent.Aim)
local Fx = script.Parent.Parent.Fx
local Break = require(Fx.BlockBreak)
local Dissolve = require(Fx.Dissolve)
local Lightning = require(Fx.Lightning)
local Quality = require(Fx.Quality)
local Profile = require(script.Parent.Parent.ProfileState)
local MineView = {}
MineView.__index = MineView

function MineView.new(plot: number, frame: CFrame, options: any): any
	local folder = Instance.new("Folder")
	folder.Name, folder.Parent = "View_" .. plot, options.parent
	return setmetatable({
		plot = plot,
		root = folder,
		renderer = Wall.new(
			folder,
			frame,
			if options.owner
				then nil
				else Config.mine.nearWindow * Config.plots.frameWidth * Config.mine.height
		),
		breaking = Break.new(folder),
		lightning = Lightning.new(
			folder,
			if options.owner then nil else math.max(8, Quality.budget().links // 4)
		),
		options = options,
		dirty = false,
		parts = {},
		moves = {},
	}, MineView)
end

function MineView:window(win: any, reset: any)
	if self.options.owner then
		self.options.receive("window", win, reset)
	else
		self.data, self.dirty = win, true
	end
end
function MineView.append(win: any, batch: any): boolean
	if
		not win
		or win.plot ~= batch.plot
		or win.front ~= batch.front
		or win.width ~= batch.width
		or win.height ~= batch.height
	then
		return false
	end
	for i, layer in batch.layers do
		win.layers[batch.offset + i] = layer
	end
	return true
end
function MineView:layers(batch: any)
	if self.options.owner then
		self.options.receive("layers", batch)
	elseif MineView.append(self.data, batch) then
		self.dirty = true
	end
end

function MineView.apply(win: any, result: any)
	local radius = (win.width - 1) // 2
	for _, cell in result.cells do
		local layer = win.layers[cell.dRel + 1]
		if layer then
			layer[(cell.x + radius) * win.height + cell.y + 1] = 0
		end
	end
	if result.delta > 0 then
		win.front, win.layers = result.front, result.layers
	end
	win.charge, win.damage, win.plateDamage = result.charge, result.damage, result.plateDamage
end

function MineView:result(res: any, visual: any)
	if self.options.owner then
		self.options.receive("result", res, visual)
		return
	end
	local win = self.data
	if not res.accepted or not win or res.front ~= win.front + res.delta then
		return
	end
	local now = os.clock()
	if not Profile.preference("hideOthersFx") then
		Dissolve.begin(self.breaking.dissolve, now)
		for i, cell in res.cells do
			if i > math.min(4, Quality.budget().oreLayers) then
				break
			end
			local block = Break.snapshot(self.renderer, win, cell.x, cell.y, cell.dRel, 0)
			if block then
				Dissolve.block(self.breaking.dissolve, block, now, block.frame.Position, true)
			end
		end
		for i, e in res.events do
			if i > 2 then
				break
			end
			local a, b = e.points[1], e.points[2]
			if a and b then
				Lightning.bolt(
					self.lightning,
					Wall.position(self.renderer, a.x, a.y, a.dRel, 0),
					Wall.position(self.renderer, b.x, b.y, b.dRel, 0),
					now,
					1,
					false
				)
			end
		end
	end
	MineView.apply(win, res)
	self.dirty = true
end
function MineView:event(ev: any)
	if self.options.owner then
		self.options.receive("event", ev)
		return
	end
	if not self.data or Profile.preference("hideOthersFx") then
		return
	end
	for _, p in ev.points do
		local pos =
			Wall.position(self.renderer, p.x, p.y, (p.d or self.data.front) - self.data.front, 0)
		Lightning.bolt(self.lightning, pos + Vector3.yAxis * 2, pos, os.clock(), 1, false)
		break
	end
end

function MineView:aim(screen: Vector2): any?
	return if self.data then Aim.at(self.renderer, self.data, screen) else nil
end

function MineView:draw(win: any, visible: number, damage: any, focus: number?)
	Wall.update(self.renderer, win, visible, nil)
	Break.cracks(self.breaking, self.renderer, damage, State.cellKey, nil, focus)
end
function MineView:step(now: number)
	local win = self.data
	if not win then
		return
	end
	if self.dirty then
		self.dirty = false
		self:draw(win, math.min(Quality.budget().oreLayers, Config.mine.nearWindow), win)
		local plate = if win.duel
			then nil
			else Ride.plate(
				win.front,
				Worlds.of(win.front).plateDepth,
				win.plateDamage,
				0,
				nil,
				"idle",
				false
			)
		Wall.plate(self.renderer, win, plate, self.options.translate, 1, 0)
		table.clear(self.parts)
		table.clear(self.moves)
		Wall.moves(self.renderer, win, 0, self.parts, self.moves)
		workspace:BulkMoveTo(self.parts, self.moves, Enum.BulkMoveMode.FireCFrameChanged)
	end
	Lightning.step(self.lightning, now)
	Dissolve.step(self.breaking.dissolve, now)
end

function MineView:destroy()
	Break.clear(self.breaking)
	Wall.clear(self.renderer)
	self.renderer.plateModel:Destroy()
	self.root:Destroy()
	self.data = nil
end
return MineView
