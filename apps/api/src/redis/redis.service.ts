import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(Redis) private readonly redis: Redis) {}

  get client() {
    return this.redis;
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
    } catch (error) {
      this.logger.warn(`Redis shutdown failed: ${String(error)}`);
    }
  }
}
