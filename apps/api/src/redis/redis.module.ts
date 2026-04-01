import { Global, Module } from "@nestjs/common";
import { Redis } from "ioredis";
import { RedisService } from "./redis.service";

@Global()
@Module({
  providers: [
    {
      provide: Redis,
      useFactory: () => {
        const url = process.env.REDIS_URL ?? "redis://localhost:6379";
        return new Redis(url, {
          maxRetriesPerRequest: 1
        });
      }
    },
    RedisService
  ],
  exports: [Redis, RedisService]
})
export class RedisModule {}
