import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from "./auth.constants";

@Injectable()
export class SessionService {
  createSessionToken() {
    return randomBytes(32).toString("base64url");
  }

  hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  getExpirationDate() {
    return new Date(Date.now() + SESSION_TTL_MS);
  }

  parseCookies(cookieHeader?: string | string[]) {
    const header = Array.isArray(cookieHeader) ? cookieHeader.join(";") : cookieHeader;

    if (!header) {
      return {};
    }

    return header
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .reduce<Record<string, string>>((acc, part) => {
        const separatorIndex = part.indexOf("=");

        if (separatorIndex === -1) {
          return acc;
        }

        const key = part.slice(0, separatorIndex).trim();
        const value = part.slice(separatorIndex + 1).trim();
        acc[key] = decodeURIComponent(value);
        return acc;
      }, {});
  }

  buildSessionCookie(token: string, expiresAt: Date) {
    return this.serializeCookie(token, expiresAt);
  }

  clearSessionCookie() {
    return this.serializeCookie("", new Date(0));
  }

  private serializeCookie(token: string, expiresAt: Date) {
    const cookieParts = [
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Expires=${expiresAt.toUTCString()}`
    ];

    if (process.env.NODE_ENV === "production") {
      cookieParts.push("Secure");
    }

    return cookieParts.join("; ");
  }
}
