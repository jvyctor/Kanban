import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createHash } from "crypto";
import { isRateLimitDisabled } from "../../config/runtime-config";
import { AUTH_RATE_LIMIT_KEY, type AuthRateLimitOptions } from "../decorators/rate-limit.decorator";
import { RateLimitStoreService } from "../../security/rate-limit-store.service";
import { SecurityAuditService } from "../../security/security-audit.service";

type RequestWithHeaders = {
  ip?: string;
  socket?: { remoteAddress?: string };
  body?: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
};

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitStoreService: RateLimitStoreService,
    private readonly securityAuditService: SecurityAuditService
  ) {}

  async canActivate(context: ExecutionContext) {
    if (isRateLimitDisabled()) {
      return true;
    }

    const options = this.reflector.getAllAndOverride<AuthRateLimitOptions>(AUTH_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const ip = this.getClientIp(request);
    const states = [
      await this.rateLimitStoreService.hit(
        `rate-limit:${options.key}:ip:${ip}`,
        options.windowSeconds,
        options.limit
      )
    ];

    const identifierState = await this.hitIdentifierLimit(request, options);

    if (identifierState) {
      states.push(identifierState);
    }

    const exceededState = states.find((state) => state.exceeded);

    if (exceededState) {
      const retryAfterSeconds = Math.max(1, Math.ceil((exceededState.resetAt - Date.now()) / 1000));

      this.securityAuditService.warn("auth.rate_limit.exceeded", {
        key: options.key,
        ip,
        identifierField: options.identifierField ?? null,
        retryAfterSeconds
      });

      throw new HttpException(
        {
          message: "Too many requests",
          retryAfterSeconds
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }

  private getClientIp(request: RequestWithHeaders) {
    const forwarded = request.headers["x-forwarded-for"];
    const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const forwardedIp = forwardedValue?.split(",")[0]?.trim();

    if (forwardedIp) {
      return forwardedIp;
    }

    if (request.ip?.trim()) {
      return request.ip.trim();
    }

    return request.socket?.remoteAddress?.trim() || "unknown";
  }

  private async hitIdentifierLimit(
    request: RequestWithHeaders,
    options: AuthRateLimitOptions
  ) {
    if (!options.identifierField) {
      return null;
    }

    const rawValue = request.body?.[options.identifierField];

    if (typeof rawValue !== "string") {
      return null;
    }

    const normalizedValue = rawValue.trim().toLowerCase();

    if (!normalizedValue) {
      return null;
    }

    const hashedValue = createHash("sha256").update(normalizedValue).digest("hex");

    return this.rateLimitStoreService.hit(
      `rate-limit:${options.key}:identifier:${hashedValue}`,
      options.identifierWindowSeconds ?? options.windowSeconds,
      options.identifierLimit ?? options.limit
    );
  }
}
