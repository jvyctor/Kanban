import { SetMetadata } from "@nestjs/common";

export const AUTH_RATE_LIMIT_KEY = "auth_rate_limit";

export type AuthRateLimitOptions = {
  limit: number;
  windowSeconds: number;
  key: string;
  identifierField?: string;
  identifierLimit?: number;
  identifierWindowSeconds?: number;
};

export const AuthRateLimit = (options: AuthRateLimitOptions) =>
  SetMetadata(AUTH_RATE_LIMIT_KEY, options);
