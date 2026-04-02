import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  info(event: string, details: Record<string, unknown>) {
    this.logger.log(this.serialize(event, details));
  }

  warn(event: string, details: Record<string, unknown>) {
    this.logger.warn(this.serialize(event, details));
  }

  private serialize(event: string, details: Record<string, unknown>) {
    return JSON.stringify({
      category: "security",
      event,
      timestamp: new Date().toISOString(),
      ...details
    });
  }
}
