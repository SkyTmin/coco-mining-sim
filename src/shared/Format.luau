--!strict

local Format = {}
local SUFFIXES = { "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc" }

function Format.short(n: number): string
	local magnitude = math.abs(n)
	local sign = if n < 0 then "-" else ""
	if n ~= n or magnitude == math.huge then
		return tostring(n)
	end
	if magnitude < 1000 then
		return sign .. tostring(math.floor(magnitude))
	end

	-- Start from a three-digit decimal, then step down if formatting rounded it up.
	-- Comparing the decimal value avoids truncating exact boundaries such as 1.15K.
	local rounded = string.format("%.2e", magnitude)
	local leading, fraction, power = rounded:match("^(%d)%.(%d%d)e([+-]%d+)$")
	local digits = tonumber(leading .. fraction) :: number
	local exponent = tonumber(power) :: number
	if (tonumber(rounded) or math.huge) > magnitude then
		digits -= 1
		if digits == 99 then
			digits = 999
			exponent -= 1
		end
	end

	local text = tostring(digits)
	local suffix = SUFFIXES[math.floor(exponent / 3)]
	local wholeDigits = if suffix then exponent % 3 + 1 else 1
	if wholeDigits < 3 then
		text = text:sub(1, wholeDigits) .. "." .. text:sub(wholeDigits + 1)
	end
	return sign .. text .. (suffix or "e" .. tostring(exponent))
end

function Format.grouped(n: number): string
	if n ~= n or math.abs(n) == math.huge then
		return tostring(n)
	end
	local digits = string.format("%.0f", math.floor(math.abs(n)))
	local firstGroup = (#digits - 1) % 3 + 1
	local groups = { digits:sub(1, firstGroup) }
	for i = firstGroup + 1, #digits, 3 do
		table.insert(groups, digits:sub(i, i + 2))
	end
	return (if n < 0 then "-" else "") .. table.concat(groups, "\u{202F}")
end

return Format
