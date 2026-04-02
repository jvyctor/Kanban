import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { randomUUID } from "crypto";
import { AppModule } from "./app.module";
import {
  getApiPort,
  getApiSecurityHeaders,
  isCorsOriginAllowed,
  validateRuntimeConfig
} from "./config/runtime-config";

async function bootstrap() {
  validateRuntimeConfig();
  const app = await NestFactory.create(AppModule);
  const httpAdapter = app.getHttpAdapter().getInstance();
  httpAdapter.disable?.("x-powered-by");

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, success?: boolean) => void
    ) => {
      if (isCorsOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin not allowed"), false);
    },
    credentials: true
  });

  app.use((_request: unknown, response: { setHeader(name: string, value: string): void }, next: () => void) => {
    const headers = getApiSecurityHeaders();

    for (const [header, value] of Object.entries(headers)) {
      response.setHeader(header, value);
    }

    next();
  });

  app.use(
    (
      request: {
        headers: Record<string, string | string[] | undefined>;
        method: string;
        originalUrl?: string;
        url?: string;
      },
      response: {
        setHeader(name: string, value: string): void;
        on(event: "finish", listener: () => void): void;
        statusCode: number;
      },
      next: () => void
    ) => {
      const incomingRequestId = request.headers["x-request-id"];
      const requestId = Array.isArray(incomingRequestId)
        ? incomingRequestId[0]
        : incomingRequestId || randomUUID();
      const startedAt = Date.now();

      response.setHeader("X-Request-Id", requestId);
      response.on("finish", () => {
        console.log(
          JSON.stringify({
            category: "http",
            requestId,
            method: request.method,
            path: request.originalUrl ?? request.url ?? "/",
            statusCode: response.statusCode,
            durationMs: Date.now() - startedAt,
            timestamp: new Date().toISOString()
          })
        );
      });

      next();
    }
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true
    })
  );

  const port = getApiPort();
  await app.listen(port);
}

void bootstrap();
