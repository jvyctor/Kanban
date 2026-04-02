import { Global, Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RateLimitStoreService } from "./rate-limit-store.service";
import { RealtimeRateLimitService } from "./realtime-rate-limit.service";
import { SecurityAuditService } from "./security-audit.service";
import { SecurityMaintenanceService } from "./security-maintenance.service";

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    RateLimitStoreService,
    RealtimeRateLimitService,
    SecurityAuditService,
    SecurityMaintenanceService
  ],
  exports: [RateLimitStoreService, RealtimeRateLimitService, SecurityAuditService]
})
export class SecurityModule {}
