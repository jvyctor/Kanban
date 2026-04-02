import { Global, Module } from "@nestjs/common";
import { Redis } from "ioredis";
import { getRedisOptions, getRedisUrl } from "../config/runtime-config";
import { RedisService } from "./redis.service";

@Global()
@Module({
  providers: [
    {
      provide: Redis,
      useFactory: () => {
        const client = new Redis(getRedisUrl(), getRedisOptions());
        return client;
      }
    },
    RedisService
  ],
  exports: [Redis, RedisService]
})
export class RedisModule {}
