import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const runtimeConfig = require("../dist/config/runtime-config.js");
const { SessionService } = require("../dist/auth/session.service.js");
const { RateLimitStoreService } = require("../dist/security/rate-limit-store.service.js");
const { SecurityMaintenanceService } = require("../dist/security/security-maintenance.service.js");

test("runtime config restricts CORS origins", () => {
  process.env.APP_URL = "https://app.example.com";
  process.env.CORS_ORIGINS = "https://app.example.com,https://admin.example.com";

  assert.equal(runtimeConfig.isCorsOriginAllowed("https://app.example.com"), true);
  assert.equal(runtimeConfig.isCorsOriginAllowed("https://admin.example.com"), true);
  assert.equal(runtimeConfig.isCorsOriginAllowed("https://evil.example.com"), false);
});

test("session cookie uses secure strict policy on non-local https app", () => {
  process.env.APP_URL = "https://app.example.com";
  delete process.env.SESSION_COOKIE_SAME_SITE;

  const sessionService = new SessionService();
  const cookie = sessionService.buildSessionCookie("token", new Date("2030-01-01T00:00:00.000Z"));

  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
});

test("rate limit store falls back to memory when redis is unavailable", async () => {
  const rateLimitStore = new RateLimitStoreService({
    client: {
      multi() {
        throw new Error("redis unavailable");
      }
    }
  });

  const first = await rateLimitStore.hit("test-key", 60, 2);
  const second = await rateLimitStore.hit("test-key", 60, 2);
  const third = await rateLimitStore.hit("test-key", 60, 2);

  assert.equal(first.exceeded, false);
  assert.equal(second.exceeded, false);
  assert.equal(third.exceeded, true);
});

test("security maintenance removes expired auth artifacts and logs the cleanup", async () => {
  const recordedEvents = [];
  const securityMaintenance = new SecurityMaintenanceService(
    {
      session: {
        deleteMany: async () => ({ count: 2 })
      },
      passwordResetToken: {
        deleteMany: async () => ({ count: 3 })
      },
      boardInvitation: {
        deleteMany: async () => ({ count: 1 })
      },
      $transaction: async (operations) => Promise.all(operations)
    },
    {
      info(event, payload) {
        recordedEvents.push({ event, payload });
      }
    }
  );

  await securityMaintenance.runCleanup();

  assert.equal(recordedEvents.length, 1);
  assert.equal(recordedEvents[0].event, "security.cleanup.completed");
  assert.deepEqual(recordedEvents[0].payload, {
    expiredSessions: 2,
    expiredResetTokens: 3,
    expiredInvitations: 1
  });
});
