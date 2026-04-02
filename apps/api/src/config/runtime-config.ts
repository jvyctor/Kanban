const DEFAULT_APP_URL = "http://localhost:3000";
const DEFAULT_API_PORT = 3001;
const DEFAULT_REDIS_URL = "redis://localhost:6379";
const DEFAULT_CLEANUP_INTERVAL_MS = 1000 * 60 * 15;

type SameSitePolicy = "Lax" | "Strict" | "None";

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, "");
}

function parseUrl(value: string) {
  return new URL(value);
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getAppUrl() {
  const value = process.env.APP_URL?.trim();
  return value ? value.replace(/\/+$/, "") : DEFAULT_APP_URL;
}

export function getApiPort() {
  const rawValue = process.env.PORT?.trim();

  if (!rawValue) {
    return DEFAULT_API_PORT;
  }

  const port = Number(rawValue);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }

  return port;
}

export function getAllowedCorsOrigins() {
  const configuredOrigins = process.env.CORS_ORIGINS?.split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  if (configuredOrigins && configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  return [normalizeOrigin(getAppUrl())];
}

export function isCorsOriginAllowed(origin?: string | null) {
  if (!origin) {
    return true;
  }

  return getAllowedCorsOrigins().includes(normalizeOrigin(origin));
}

export function getSessionCookieSameSite(): SameSitePolicy {
  const configuredValue = process.env.SESSION_COOKIE_SAME_SITE?.trim();

  if (!configuredValue) {
    return shouldUseSecureCookies() ? "Strict" : "Lax";
  }

  const normalized = configuredValue.toLowerCase();

  if (normalized === "lax") {
    return "Lax";
  }

  if (normalized === "strict") {
    return "Strict";
  }

  if (normalized === "none") {
    return "None";
  }

  throw new Error("SESSION_COOKIE_SAME_SITE must be one of: Lax, Strict, None");
}

export function shouldUseSecureCookies() {
  const appUrl = parseUrl(getAppUrl());
  return appUrl.protocol === "https:" && !isLocalHostname(appUrl.hostname);
}

export function getRedisUrl() {
  return process.env.REDIS_URL?.trim() || DEFAULT_REDIS_URL;
}

export function getRedisOptions() {
  return {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    commandTimeout: 3000,
    enableOfflineQueue: false,
    keepAlive: 30000,
    retryStrategy: (times: number) => Math.min(times * 200, 2000)
  };
}

export function getSmtpConfig() {
  const port = Number(process.env.SMTP_PORT ?? "0");

  return {
    from: process.env.SMTP_FROM?.trim() || "",
    host: process.env.SMTP_HOST?.trim() || "",
    port,
    user: process.env.SMTP_USER?.trim() || "",
    pass: process.env.SMTP_PASS?.trim() || "",
    secure: port === 465,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000
  };
}

export function getCleanupIntervalMs() {
  const rawValue = process.env.SECURITY_CLEANUP_INTERVAL_MS?.trim();

  if (!rawValue) {
    return DEFAULT_CLEANUP_INTERVAL_MS;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value) || value < 1000) {
    throw new Error("SECURITY_CLEANUP_INTERVAL_MS must be a number greater than 1000");
  }

  return value;
}

export function getApiSecurityHeaders() {
  const headers: Record<string, string> = {
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy":
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
  };

  if (shouldUseSecureCookies()) {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  }

  return headers;
}

export function getRealtimeRateLimitConfig() {
  return {
    "board-join": {
      limit: 20,
      windowSeconds: 60
    },
    "card-move": {
      limit: 120,
      windowSeconds: 60
    }
  };
}

export function isRateLimitDisabled() {
  return process.env.DISABLE_RATE_LIMITS === "true";
}

export function validateRuntimeConfig() {
  getApiPort();
  parseUrl(getAppUrl());
  getAllowedCorsOrigins().forEach((origin) => {
    parseUrl(origin);
  });
  getSessionCookieSameSite();
  getCleanupIntervalMs();
}
