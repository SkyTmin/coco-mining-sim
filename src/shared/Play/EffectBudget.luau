--!strict
local Budget = {}
function Budget.usage(leases: { any }, now: number): (number, number)
	local alive, recent = 0, 0
	for i = #leases, 1, -1 do
		local entry = leases[i]
		if now < entry.untilAt then
			alive += entry.count
		end
		if now - entry.at < 1 then
			recent += entry.count
		end
		if now >= entry.untilAt and now - entry.at >= 1 then
			table.remove(leases, i)
		end
	end
	return alive, recent
end
function Budget.take(
	leases: { any },
	now: number,
	count: number,
	life: number,
	cap: number,
	perSecond: number?
): number
	local alive, recent = Budget.usage(leases, now)
	local granted = math.max(
		0,
		math.min(
			math.floor(count),
			cap - alive,
			if perSecond then perSecond - recent else math.huge
		)
	)
	if granted > 0 then
		table.insert(leases, { at = now, untilAt = now + life, count = granted })
	end
	return granted
end
return Budget
