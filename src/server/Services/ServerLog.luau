--!strict

local LogService = game:GetService("LogService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Remotes = require(ReplicatedStorage.Shared.Remotes)

local ServerLog = {}
local LIMIT = 20

function ServerLog.Start()
	local remote = Remotes.event("ServerLog")
	local recent: { { at: number, message: string, kind: Enum.MessageType } } = {}
	LogService.MessageOut:Connect(function(message, kind)
		if kind ~= Enum.MessageType.MessageWarning and kind ~= Enum.MessageType.MessageError then
			return
		end
		local now = os.clock()
		while recent[1] and now - recent[1].at >= 1 do
			table.remove(recent, 1)
		end
		if #recent >= LIMIT then
			return
		end
		for _, entry in recent do
			if entry.message == message and entry.kind == kind then
				return
			end
		end
		table.insert(recent, { at = now, message = message, kind = kind })
		for _, player in Players:GetPlayers() do
			if player:GetAttribute("CreativeAllowed") == true then
				remote:FireClient(player, message, kind == Enum.MessageType.MessageError)
			end
		end
	end)
end

return ServerLog
