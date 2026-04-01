import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BoardsModule } from "./boards/boards.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    BoardsModule
  ]
})
export class AppModule {}
