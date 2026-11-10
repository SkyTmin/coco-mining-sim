--!strict
-- [владелец] TZ-03f §9. A resting right thumb digs, dragging first only aims.
local Touch = {}
export type Gesture = {
	x: number,
	y: number,
	px: number,
	py: number,
	at: number,
	distance: number,
	holding: boolean,
	panning: boolean,
}

function Touch.begin(x: number, y: number, now: number): Gesture
	return { x = x, y = y, px = x, py = y, at = now, distance = 0, holding = false, panning = false }
end

function Touch.move(g: Gesture, x: number, y: number): (number, number)
	local dx, dy = x - g.px, y - g.py
	g.px, g.py = x, y
	g.distance = math.max(g.distance, math.sqrt((x - g.x) ^ 2 + (y - g.y) ^ 2))
	if g.distance > 14 then
		g.panning = true
	end
	return dx, dy
end

function Touch.step(g: Gesture, now: number): boolean
	if not g.holding and not g.panning and now - g.at >= 0.12 then
		g.holding = true
	end
	return g.holding
end

function Touch.finish(g: Gesture, now: number): boolean
	return not g.holding and not g.panning and now - g.at < 0.3 and g.distance < 12
end
return Touch
