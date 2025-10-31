// services/hybridRateLimitService.ts
import { redis_client } from '~/lib/redis'

interface RateLimitResult {
  allowed: boolean
  reason?: 'frequency' | 'cost' | 'both'
  retryAfter?: number
  limits: {
    frequency: {
      current: number
      max: number
      remaining: number
      resetIn: number
    }
    cost: {
      current: number
      max: number
      remaining: number
      resetIn: number
    }
  }
}

export class HybridRateLimitService {
  // Sliding Window for request frequency
  private static FREQUENCY_WINDOW = 60  // 1 minute in seconds
  private static MAX_REQUESTS = 20      // 20 requests per minute
  
  // Token Bucket for cost control (tokens represent approximate API cost units)
  private static MAX_TOKENS = 1000      // 1000 tokens = ~$0.10 worth of API calls
  private static REFILL_RATE = 1000 / (60 * 60)  // Refill over 1 hour

  static async checkRateLimit(
    userId: string, 
    endpoint: string = 'chat',
    estimatedCost: number = 10 // Default cost for a chat message
  ): Promise<RateLimitResult> {
    const frequencyKey = `rate_limit:frequency:${endpoint}:${userId}`
    const costKey = `rate_limit:cost:${endpoint}:${userId}`
    const now = Math.floor(Date.now() / 1000)

    try {
      const pipeline = redis_client.pipeline()
      
      // 1. SLIDING WINDOW - Frequency check
      const windowStart = now - this.FREQUENCY_WINDOW
      pipeline.zremrangebyscore(frequencyKey, 0, windowStart)
      pipeline.zadd(frequencyKey, now, `${now}:${Math.random()}`)
      pipeline.expire(frequencyKey, this.FREQUENCY_WINDOW * 2)
      pipeline.zcard(frequencyKey)
      
      // 2. TOKEN BUCKET - Cost check
      pipeline.hmget(costKey, 'tokens', 'last_refill')
      
      const results = await pipeline.exec()
      
      const frequencyCount = results[3] as number
      const [currentTokens, lastRefill] = results[4] as [string, string]
      
      // Calculate token refill
      let tokens = parseInt(currentTokens || this.MAX_TOKENS.toString())
      const lastRefillTime = parseInt(lastRefill || now.toString())
      const timePassed = Math.max(0, now - lastRefillTime)
      
      if (timePassed > 0) {
        tokens = Math.min(this.MAX_TOKENS, tokens + Math.floor(timePassed * this.REFILL_RATE))
        // Update tokens and last_refill in Redis
        await redis_client.hset(costKey, {
          'tokens': tokens,
          'last_refill': now
        })
        await redis_client.expire(costKey, 2 * 60 * 60) // 2 hour expiry
      }
      
      const frequencyAllowed = frequencyCount <= this.MAX_REQUESTS
      const costAllowed = tokens >= estimatedCost
      
      // Update tokens if request is allowed and cost is deducted
      if (costAllowed && frequencyAllowed) {
        await redis_client.hset(costKey, 'tokens', tokens - estimatedCost)
      }
      
      const frequencyReset = now + this.FREQUENCY_WINDOW
      const costReset = now + Math.ceil((this.MAX_TOKENS - (tokens - estimatedCost)) / this.REFILL_RATE)
      
      return {
        allowed: frequencyAllowed && costAllowed,
        reason: !frequencyAllowed && !costAllowed ? 'both' : 
                !frequencyAllowed ? 'frequency' : 
                !costAllowed ? 'cost' : undefined,
        retryAfter: !frequencyAllowed ? frequencyReset - now : 
                   !costAllowed ? costReset - now : undefined,
        limits: {
          frequency: {
            current: frequencyCount,
            max: this.MAX_REQUESTS,
            remaining: Math.max(0, this.MAX_REQUESTS - frequencyCount),
            resetIn: frequencyReset - now
          },
          cost: {
            current: tokens,
            max: this.MAX_TOKENS,
            remaining: Math.max(0, tokens - estimatedCost),
            resetIn: costReset - now
          }
        }
      }
      
    } catch (error) {
      console.error('Rate limit check failed:', error)
      // Fail open - allow requests if Redis fails
      return {
        allowed: true,
        limits: {
          frequency: { 
            current: 0, 
            max: this.MAX_REQUESTS, 
            remaining: this.MAX_REQUESTS,
            resetIn: this.FREQUENCY_WINDOW
          },
          cost: { 
            current: this.MAX_TOKENS, 
            max: this.MAX_TOKENS, 
            remaining: this.MAX_TOKENS,
            resetIn: 3600 // 1 hour
          }
        }
      }
    }
  }

  static async getRateLimitStatus(userId: string, endpoint: string = 'chat') {
    const frequencyKey = `rate_limit:frequency:${endpoint}:${userId}`
    const costKey = `rate_limit:cost:${endpoint}:${userId}`
    const now = Math.floor(Date.now() / 1000)

    try {
      const pipeline = redis_client.pipeline()
      
      // Frequency status
      const windowStart = now - this.FREQUENCY_WINDOW
      pipeline.zremrangebyscore(frequencyKey, 0, windowStart)
      pipeline.zcard(frequencyKey)
      
      // Cost status
      pipeline.hmget(costKey, 'tokens', 'last_refill')
      
      const results = await pipeline.exec()
      const frequencyCount = results[1] as number
      const [currentTokens, lastRefill] = results[2] as [string, string]
      
      // Calculate current tokens
      let tokens = parseInt(currentTokens || this.MAX_TOKENS.toString())
      const lastRefillTime = parseInt(lastRefill || now.toString())
      const timePassed = Math.max(0, now - lastRefillTime)
      
      if (timePassed > 0) {
        tokens = Math.min(this.MAX_TOKENS, tokens + Math.floor(timePassed * this.REFILL_RATE))
      }
      
      return {
        frequency: {
          current: frequencyCount,
          max: this.MAX_REQUESTS,
          remaining: Math.max(0, this.MAX_REQUESTS - frequencyCount),
          resetIn: (now + this.FREQUENCY_WINDOW) - now
        },
        cost: {
          current: tokens,
          max: this.MAX_TOKENS,
          remaining: Math.max(0, tokens),
          resetIn: Math.ceil((this.MAX_TOKENS - tokens) / this.REFILL_RATE)
        }
      }
    } catch (error) {
      console.error('Failed to get rate limit status:', error)
      return null
    }
  }

  // Method to estimate cost based on message complexity
  static estimateCost(message: string, model: string): number {
    // Simple cost estimation based on message length and model
    const baseCost = 1
    const lengthCost = Math.ceil(message.length / 100) // 1 token per 100 chars
    const modelMultiplier = model.includes('pro') ? 2 : 1
    
    return baseCost + lengthCost * modelMultiplier
  }
}