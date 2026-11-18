--!strict
local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage").Shared
local Remotes = require(Shared.Remotes)
local Wire = require(Shared.Mine.MineWire)
local MineView = require(script.Parent.MineView)
local OwnerPlayback = require(script.Parent.OwnerPlayback)
local Controller = {}

local decoders = {
	window = Wire.decodeWindow,
	layers = Wire.decodeLayers,
	result = Wire.decodeResult,
	event = Wire.decodeEvent,
}

function Controller.start(guiParent: Instance, translate: (string, ...any) -> string)
	local views: any = { ownerView = MineView.new }
	local owner: any
	local pending: { any }? = nil
	local function connect(world: Folder, setup: (number) -> any)
		Remotes.event("MineWindow").OnClientEvent:Connect(function(kind, packet, extra, temporary)
			if kind == "watch" or kind == "unwatch" then
				local current = views.visitor
				if current and kind == "watch" and current.plot == packet then
					return
				end
				if current and (kind == "watch" or current.plot == packet) then
					current:destroy()
					views.visitor = nil
				end
				if kind == "watch" then
					views.visitor = MineView.new(
						packet,
						extra,
						{ owner = false, parent = world, translate = translate }
					)
				end
				return
			end
			local decode = decoders[kind]
			local data = decode and decode(packet)
			if not data then
				return
			end
			if kind == "window" then
				data.duel = temporary == true
			end
			local target = if views.visitor and views.visitor.plot == data.plot
				then views.visitor
				else owner
			if target and target.plot == data.plot then
				target[kind](target, data, extra)
				return
			end
			local plot = Players.LocalPlayer:GetAttribute("Plot")
			if owner or (plot and plot ~= data.plot) then
				return
			end
			-- The plot origin may still be streaming in when the first window and its tail arrive.
			if pending then
				table.insert(pending, { kind, data, extra })
			elseif kind == "window" then
				pending = { { kind, data, extra } }
				owner = setup(data.plot)
				local queued = pending
				pending = nil
				if owner then
					for _, item in queued do
						if item[2].plot == owner.plot then
							owner[item[1]](owner, item[2], item[3])
						end
					end
				end
			end
		end)
	end
	OwnerPlayback.start(guiParent, translate, views, connect)
end
return Controller
