import { NextResponse, type NextRequest } from "next/server";

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, "");
}

function buildContentSecurityPolicy(nonce: string) {
  const apiUrl = normalizeOrigin(
    process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:3001"
  );
  const websocketUrl = apiUrl.replace(/^http/, "ws");
  const isDevelopment = process.env.NODE_ENV !== "production";

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "manifest-src 'self'",
    `connect-src 'self' ${apiUrl} ${websocketUrl}`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `style-src 'self' ${isDevelopment ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDevelopment ? "'unsafe-eval'" : ""}`.trim(),
    "script-src-attr 'none'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"])
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildContentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" }
      ]
    }
  ]
};
