import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";
import { SessionService } from "./session.service";
import { AppRoleGuard } from "./guards/app-role.guard";
import { AuthRateLimitGuard } from "./guards/auth-rate-limit.guard";
import { AuthGuard } from "./guards/auth.guard";

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    SessionService,
    AppRoleGuard,
    AuthGuard,
    AuthRateLimitGuard
  ],
  exports: [AuthService, SessionService, AuthGuard]
})
export class AuthModule {}
