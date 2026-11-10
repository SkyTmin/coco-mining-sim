--!strict

local DepthQueue = {}
local INTERVAL = 1 / 8

export type Queue = { shown: number, nextAt: number, final: number? }

function DepthQueue.new(depth: number): Queue
	return { shown = depth, nextAt = -math.huge }
end

function DepthQueue.step(
	queue: Queue,
	now: number,
	target: number,
	finish: boolean
): (number?, boolean)
	if finish then
		queue.final = target
	end
	if now < queue.nextAt then
		return nil, false
	end
	local punch = queue.final ~= nil
	local depth = queue.final or target
	if depth == queue.shown and not punch then
		return nil, false
	end
	queue.shown, queue.nextAt, queue.final = depth, now + INTERVAL, nil
	return depth, punch
end

return DepthQueue
