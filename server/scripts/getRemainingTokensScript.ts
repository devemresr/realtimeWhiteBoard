export const getRemainingTokensScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local capacity = tonumber(ARGV[2])
      local refill_rate = tonumber(ARGV[3])
      
      local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
      local tokens = tonumber(bucket[1]) or capacity
      local last_refill = tonumber(bucket[2]) or now
      
      local time_elapsed = (now - last_refill) / 1000
      local tokens_to_add = time_elapsed * refill_rate
      tokens = math.min(capacity, tokens + tokens_to_add)
      
      return math.floor(tokens)
    `;
