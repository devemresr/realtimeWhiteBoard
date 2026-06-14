export const addToStreamAndDedup = `
local stream = KEYS[1]
local dedupHash = KEYS[2]
local authorIdHash = KEYS[3]
local canvasMessageIds = cjson.decode(ARGV[1])
local authorId= ARGV[2]

-- Check for duplicates in hash
for _, msgId in ipairs(canvasMessageIds) do
    if redis.call('HEXISTS', dedupHash, msgId) == 1 then
        return redis.error_reply("DUPLICATE: message is already produced into the stream.")
    end
end

-- Build XADD args from ARGV[3] onward
local xaddArgs = { stream }
for i = 3, #ARGV do
    table.insert(xaddArgs, ARGV[i])
end

local redisMessageId = redis.call('XADD', unpack(xaddArgs))

if not redisMessageId then
    return redis.error_reply("XADD_FAILED: stream write returned nil")
end

-- Register the IDs in the hash after successful write
for _, msgId in ipairs(canvasMessageIds) do
    redis.call('HSET', dedupHash, msgId, redisMessageId)
    redis.call('HSET', authorIdHash, msgId, authorId)
end
redis.call('EXPIRE', dedupHash, 86400)
redis.call('EXPIRE', authorIdHash, 86400)

return redisMessageId
`;
