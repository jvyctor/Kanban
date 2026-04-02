import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { AppRole } from "@prisma/client";
import { createHash } from "crypto";
import { SecurityAuditService } from "../security/security-audit.service";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { getAppUrl } from "../config/runtime-config";
import { CurrentUser } from "./current-user.interface";
import { SESSION_COOKIE_NAME } from "./auth.constants";
import { LoginDto } from "./dto/login.dto";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { PasswordService } from "./password.service";
import { SessionService } from "./session.service";

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
    private readonly securityAuditService: SecurityAuditService
  ) {}

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();
    const displayName = registerDto.displayName.trim();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });

    if (existingUser) {
      throw new ConflictException("Email already in use");
    }

    const passwordHash = await this.passwordService.hashPassword(registerDto.password);

    const user = await this.prisma.user.create({
      data: {
        email,
        displayName,
        passwordHash,
        appRole: "USER"
      }
    });

    await this.createStarterBoardForUser(user.id, displayName);

    try {
      await this.mailService.sendWelcomeEmail({
        to: email,
        displayName,
        appUrl: getAppUrl()
      });
    } catch (error) {
      this.logger.warn(`Welcome email failed for ${email}`);
      this.logger.debug(String(error));
    }

    return this.createSessionPayload(user.id);
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      this.securityAuditService.warn("auth.login.failed", {
        reason: "user_not_found",
        emailHash: this.hashIdentifier(email)
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    const isValidPassword = await this.passwordService.verifyPassword(
      loginDto.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      this.securityAuditService.warn("auth.login.failed", {
        reason: "invalid_password",
        userId: user.id,
        emailHash: this.hashIdentifier(email)
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.createSessionPayload(user.id);
  }

  async requestPasswordReset(requestDto: RequestPasswordResetDto) {
    const email = requestDto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true
      }
    });

    if (!user) {
      this.securityAuditService.info("auth.password_reset.request_ignored", {
        emailHash: this.hashIdentifier(email)
      });
      return;
    }

    await this.prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null
      }
    });

    const token = this.sessionService.createSessionToken();
    const tokenHash = this.sessionService.hashToken(token);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt
      }
    });

    await this.mailService.sendPasswordResetEmail({
      to: user.email,
      displayName: user.displayName,
      resetUrl: `${getAppUrl()}/?reset=${encodeURIComponent(token)}`
    });

    this.securityAuditService.info("auth.password_reset.requested", {
      userId: user.id,
      emailHash: this.hashIdentifier(user.email)
    });
  }

  async resetPassword(resetDto: ResetPasswordDto) {
    const tokenHash = this.sessionService.hashToken(resetDto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: true
      }
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
      this.securityAuditService.warn("auth.password_reset.failed", {
        reason: "invalid_or_expired_token",
        tokenHash
      });
      throw new BadRequestException("Reset token is invalid or expired");
    }

    const passwordHash = await this.passwordService.hashPassword(resetDto.password);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash }
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() }
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.userId,
          id: { not: resetToken.id }
        }
      }),
      this.prisma.session.deleteMany({
        where: {
          userId: resetToken.userId
        }
      })
    ]);

    this.securityAuditService.info("auth.password_reset.completed", {
      userId: resetToken.userId
    });
  }

  async logoutFromHeaders(headers: Record<string, string | string[] | undefined>) {
    const token = this.readSessionTokenFromHeaders(headers);

    if (!token) {
      return;
    }

    await this.prisma.session.deleteMany({
      where: {
        tokenHash: this.sessionService.hashToken(token)
      }
    });
  }

  async getCurrentUserFromHeaders(headers: Record<string, string | string[] | undefined>) {
    const token = this.readSessionTokenFromHeaders(headers);

    if (!token) {
      return null;
    }

    const session = await this.prisma.session.findUnique({
      where: {
        tokenHash: this.sessionService.hashToken(token)
      },
      include: {
        user: true
      }
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt <= new Date()) {
      await this.prisma.session.delete({
        where: { id: session.id }
      });
      return null;
    }

    return this.toCurrentUser(session.user);
  }

  async listUsers() {
    return this.prisma.user.findMany({
      orderBy: {
        createdAt: "asc"
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        appRole: true,
        createdAt: true
      }
    });
  }

  async updateUserRole(actor: CurrentUser, userId: string, appRole: AppRole) {
    if (actor.id === userId && actor.appRole !== appRole) {
      const adminCount = await this.prisma.user.count({
        where: { appRole: "ADMIN" }
      });

      if (adminCount <= 1) {
        throw new BadRequestException("At least one admin must remain");
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { appRole },
      select: {
        id: true,
        email: true,
        displayName: true,
        appRole: true
      }
    });
  }

  private async createSessionPayload(userId: string) {
    const token = this.sessionService.createSessionToken();
    const expiresAt = this.sessionService.getExpirationDate();

    await this.prisma.session.create({
      data: {
        tokenHash: this.sessionService.hashToken(token),
        userId,
        expiresAt
      }
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      token,
      expiresAt,
      user: this.toCurrentUser(user)
    };
  }

  private readSessionTokenFromHeaders(headers: Record<string, string | string[] | undefined>) {
    const cookies = this.sessionService.parseCookies(headers.cookie);
    return cookies[SESSION_COOKIE_NAME] ?? null;
  }

  private async createStarterBoardForUser(userId: string, displayName: string) {
    await this.prisma.board.create({
      data: {
        title: `Workspace de ${displayName}`,
        memberships: {
          create: {
            userId,
            role: "OWNER"
          }
        },
        lists: {
          create: [
            {
              title: "Backlog",
              position: 0,
              cards: {
                create: {
                  title: "Definir prioridade da semana",
                  description: "Primeira tarefa criada automaticamente para o novo workspace.",
                  position: 0
                }
              }
            },
            {
              title: "Doing",
              position: 1
            },
            {
              title: "Done",
              position: 2
            }
          ]
        }
      }
    });
  }

  private toCurrentUser(user: {
    id: string;
    email: string;
    displayName: string;
    appRole: AppRole;
  }): CurrentUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      appRole: user.appRole
    };
  }

  private hashIdentifier(value: string) {
    return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
  }
}
