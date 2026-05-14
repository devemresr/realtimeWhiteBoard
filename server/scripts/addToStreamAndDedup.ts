export const addToStreamAndDedup = `
local stream = KEYS[1]
local dedupHash = KEYS[2]
local canvasMessageIds = cjson.decode(ARGV[1])

-- Check for duplicates in hash
for _, msgId in ipairs(canvasMessageIds) do
    if redis.call('HEXISTS', dedupHash, msgId) == 1 then
        return redis.error_reply("DUPLICATE: message is already produced into the stream.")
    end
end

-- Build XADD args from ARGV[2] onward
local xaddArgs = { stream }
for i = 2, #ARGV do
    table.insert(xaddArgs, ARGV[i])
end

local newId = redis.call('XADD', unpack(xaddArgs))

if not newId then
    return redis.error_reply("XADD_FAILED: stream write returned nil")
end

-- Register the IDs in the hash after successful write
for _, msgId in ipairs(canvasMessageIds) do
    redis.call('HSET', dedupHash, msgId, newId)
    redis.call('EXPIRE', dedupHash, 86400)
end

return newId
`;
