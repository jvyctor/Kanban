import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { getSmtpConfig } from "../config/runtime-config";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService
  ) {}

  @Get()
  async check() {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis()
    ]);
    const smtp = this.checkSmtpConfig();

    return {
      status:
        database.status === "up" && redis.status === "up" ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        database,
        redis,
        smtp
      }
    };
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "up" };
    } catch (error) {
      return { status: "down", reason: String(error) };
    }
  }

  private async checkRedis() {
    try {
      await this.redisService.client.ping();
      return { status: "up" };
    } catch (error) {
      return { status: "down", reason: String(error) };
    }
  }

  private checkSmtpConfig() {
    const smtp = getSmtpConfig();
    const configured = Boolean(smtp.from && smtp.host && smtp.port && smtp.user && smtp.pass);

    return {
      status: configured ? "configured" : "missing"
    };
  }
}
