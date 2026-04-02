import { ForbiddenException, Injectable } from "@nestjs/common";
import { getRealtimeRateLimitConfig, isRateLimitDisabled } from "../config/runtime-config";
import { RateLimitStoreService } from "./rate-limit-store.service";
import { SecurityAuditService } from "./security-audit.service";

@Injectable()
export class RealtimeRateLimitService {
  constructor(
    private readonly rateLimitStoreService: RateLimitStoreService,
    private readonly securityAuditService: SecurityAuditService
  ) {}

  async assertWithinLimit(action: "board-join" | "card-move", userId: string, scopeId: string) {
    if (isRateLimitDisabled()) {
      return;
    }

    const config = getRealtimeRateLimitConfig()[action];
    const state = await this.rateLimitStoreService.hit(
      `rate-limit:realtime:${action}:${userId}:${scopeId}`,
      config.windowSeconds,
      config.limit
    );

    if (state.exceeded) {
      const retryAfterSeconds = Math.max(1, Math.ceil((state.resetAt - Date.now()) / 1000));

      this.securityAuditService.warn("realtime.rate_limit.exceeded", {
        action,
        userId,
        scopeId,
        retryAfterSeconds
      });

      throw new ForbiddenException("Too many realtime events");
    }
  }
}
