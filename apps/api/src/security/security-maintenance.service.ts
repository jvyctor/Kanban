import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { getCleanupIntervalMs } from "../config/runtime-config";
import { SecurityAuditService } from "./security-audit.service";

@Injectable()
export class SecurityMaintenanceService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly securityAuditService: SecurityAuditService
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.runCleanup();
    }, getCleanupIntervalMs());
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runCleanup() {
    const now = new Date();

    const [expiredSessions, expiredResetTokens, expiredInvitations] =
      await this.prisma.$transaction([
        this.prisma.session.deleteMany({
          where: {
            expiresAt: {
              lte: now
            }
          }
        }),
        this.prisma.passwordResetToken.deleteMany({
          where: {
            OR: [
              {
                expiresAt: {
                  lte: now
                }
              },
              {
                usedAt: {
                  not: null
                }
              }
            ]
          }
        }),
        this.prisma.boardInvitation.deleteMany({
          where: {
            acceptedAt: null,
            expiresAt: {
              lte: now
            }
          }
        })
      ]);

    const totalDeleted =
      expiredSessions.count + expiredResetTokens.count + expiredInvitations.count;

    if (totalDeleted > 0) {
      this.securityAuditService.info("security.cleanup.completed", {
        expiredSessions: expiredSessions.count,
        expiredResetTokens: expiredResetTokens.count,
        expiredInvitations: expiredInvitations.count
      });
    }
  }
}
