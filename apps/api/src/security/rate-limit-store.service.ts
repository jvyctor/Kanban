import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";

export type RateLimitWindow = {
  count: number;
  resetAt: number;
  exceeded: boolean;
};

@Injectable()
export class RateLimitStoreService {
  private readonly logger = new Logger(RateLimitStoreService.name);
  private readonly memoryStore = new Map<string, RateLimitWindow>();

  constructor(private readonly redisService: RedisService) {}

  async hit(key: string, windowSeconds: number, limit: number) {
    try {
      const result = await this.redisService.client
        .multi()
        .incr(key)
        .expire(key, windowSeconds, "NX")
        .ttl(key)
        .exec();

      const count = Number(result?.[0]?.[1] ?? 0);
      const ttl = Number(result?.[2]?.[1] ?? windowSeconds);
      const resetAt = Date.now() + Math.max(ttl, 1) * 1000;

      return {
        count,
        resetAt,
        exceeded: count > limit
      };
    } catch (error) {
      this.logger.warn(`Redis rate limit fallback triggered: ${String(error)}`);
      return this.hitMemory(key, windowSeconds, limit);
    }
  }

  private hitMemory(key: string, windowSeconds: number, limit: number) {
    const now = Date.now();
    const existing = this.memoryStore.get(key);

    if (!existing || existing.resetAt <= now) {
      const resetAt = now + windowSeconds * 1000;
      const next = { count: 1, resetAt, exceeded: 1 > limit };
      this.memoryStore.set(key, next);
      return next;
    }

    const next = {
      count: existing.count + 1,
      resetAt: existing.resetAt,
      exceeded: existing.count + 1 > limit
    };

    this.memoryStore.set(key, next);
    return next;
  }
}
