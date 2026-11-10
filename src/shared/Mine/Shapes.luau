--!strict

export type Cell = { x: number, y: number }
local Shapes = {}

function Shapes.cells(kind: string, x: number, y: number, width: number, height: number): { Cell }
	local radius = (width - 1) // 2
	if math.abs(x) > radius or y < 0 or y >= height or x % 1 ~= 0 or y % 1 ~= 0 then
		return {}
	end
	if kind == "single" then
		return { { x = x, y = y } }
	elseif kind == "pair" then
		local cells = { { x = x, y = y } }
		if height > 1 then
			table.insert(cells, { x = x, y = if y + 1 < height then y + 1 else y - 1 })
		end
		return cells
	elseif kind == "cross" or kind == "cross5" then
		if kind == "cross5" and width >= 3 and height >= 3 then
			x = math.clamp(x, 1 - radius, radius - 1)
			y = math.clamp(y, 1, height - 2)
		end
		local cells = { { x = x, y = y } }
		if x > -radius then
			table.insert(cells, { x = x - 1, y = y })
		end
		if x < radius then
			table.insert(cells, { x = x + 1, y = y })
		end
		if y > 0 then
			table.insert(cells, { x = x, y = y - 1 })
		end
		if y + 1 < height then
			table.insert(cells, { x = x, y = y + 1 })
		end
		return cells
	end

	local left, right, bottom, top = x, x, y, y
	if kind == "row" or kind == "wall" then
		left, right = -radius, radius
	elseif kind == "wide2" then
		left = math.min(x, math.max(-radius, radius - 1))
		right = math.min(radius, left + 1)
	elseif kind == "wide3" or kind == "square3" then
		local span = math.min(3, width)
		left = math.clamp(x - 1, -radius, radius - span + 1)
		right = left + span - 1
	elseif kind ~= "column" and kind ~= "column3" then
		return {}
	end
	if kind == "column" or kind == "wall" then
		bottom, top = 0, height - 1
	elseif kind == "column3" or kind == "square3" then
		local span = math.min(3, height)
		bottom = math.clamp(y - 1, 0, height - span)
		top = bottom + span - 1
	end
	local cells: { Cell } = {}
	for column = left, right do
		for row = bottom, top do
			table.insert(cells, { x = column, y = row })
		end
	end
	return cells
end

return Shapes
