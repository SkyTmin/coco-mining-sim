--!strict

local Bytes = {}
local ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
local PAD = string.byte("=")
local digits: { [number]: number } = {}
for i = 1, #ALPHABET do
	digits[string.byte(ALPHABET, i)] = i - 1
end

function Bytes.writeVarint(data: buffer, offset: number, value: number): number
	assert(value >= 0 and value <= 0xffffffff and value % 1 == 0, "Invalid unsigned varint")
	while value >= 128 do
		buffer.writeu8(data, offset, 128 + value % 128)
		value //= 128
		offset += 1
	end
	buffer.writeu8(data, offset, value)
	return offset + 1
end

function Bytes.readVarint(data: buffer, offset: number): (number?, number)
	local value, factor = 0, 1
	for i = 1, 5 do
		if offset >= buffer.len(data) then
			return nil, offset
		end
		local byte = buffer.readu8(data, offset)
		offset += 1
		if i == 5 and byte > 15 then
			return nil, offset
		end
		value += (byte % 128) * factor
		if byte < 128 then
			if i > 1 and byte == 0 then
				return nil, offset
			end
			return value, offset
		end
		factor *= 128
	end
	return nil, offset
end

function Bytes.base64Encode(data: buffer, length: number): string
	local parts = table.create((length + 2) // 3) :: { string }
	for offset = 0, length - 1, 3 do
		local a = buffer.readu8(data, offset)
		local hasB, hasC = offset + 1 < length, offset + 2 < length
		local b = if hasB then buffer.readu8(data, offset + 1) else 0
		local c = if hasC then buffer.readu8(data, offset + 2) else 0
		local first = string.byte(ALPHABET, a // 4 + 1)
		local second = string.byte(ALPHABET, a % 4 * 16 + b // 16 + 1)
		local third = if hasB then string.byte(ALPHABET, b % 16 * 4 + c // 64 + 1) else PAD
		local fourth = if hasC then string.byte(ALPHABET, c % 64 + 1) else PAD
		table.insert(parts, string.char(first, second, third, fourth))
	end
	return table.concat(parts)
end

function Bytes.base64Decode(text: string, limit: number): (buffer?, string?)
	if #text % 4 ~= 0 or #text > (limit + 2) // 3 * 4 then
		return nil, "Invalid base64 length"
	end
	local padding = if text:sub(-2) == "==" then 2 elseif text:sub(-1) == "=" then 1 else 0
	local size = #text // 4 * 3 - padding
	if size > limit then
		return nil, "Base64 data exceeds its limit"
	end
	local data = buffer.create(size)
	local offset = 0
	for i = 1, #text, 4 do
		local a, b, c, d = string.byte(text, i, i + 3)
		local first, second = digits[a], digits[b]
		local third, fourth = digits[c], digits[d]
		if first == nil or second == nil then
			return nil, "Invalid base64 character"
		end
		local tail = i + 3 == #text
		if tail and padding == 2 then
			if c ~= PAD or d ~= PAD or second % 16 ~= 0 then
				return nil, "Invalid base64 padding"
			end
		elseif third == nil then
			return nil, "Invalid base64 character"
		elseif tail and padding == 1 then
			if d ~= PAD or third % 4 ~= 0 then
				return nil, "Invalid base64 padding"
			end
		elseif fourth == nil then
			return nil, "Invalid base64 character"
		end
		buffer.writeu8(data, offset, first * 4 + second // 16)
		if third ~= nil then
			buffer.writeu8(data, offset + 1, second % 16 * 16 + third // 4)
		end
		if fourth ~= nil then
			buffer.writeu8(data, offset + 2, (third :: number) % 4 * 64 + fourth)
		end
		offset += 3
	end
	return data
end

return Bytes
