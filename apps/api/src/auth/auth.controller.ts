import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import { AppRole } from "@prisma/client";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.interface";
import { CurrentUserDecorator } from "./decorators/current-user.decorator";
import { AuthRateLimit } from "./decorators/rate-limit.decorator";
import { RequireAppRoles } from "./decorators/roles.decorator";
import { LoginDto } from "./dto/login.dto";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { AppRoleGuard } from "./guards/app-role.guard";
import { AuthRateLimitGuard } from "./guards/auth-rate-limit.guard";
import { AuthGuard } from "./guards/auth.guard";
import { SessionService } from "./session.service";

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService
  ) {}

  @Post("auth/register")
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({ key: "auth-register", limit: 5, windowSeconds: 60 * 15 })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: { setHeader(name: string, value: string): void }
  ) {
    const session = await this.authService.register(registerDto);
    response.setHeader(
      "Set-Cookie",
      this.sessionService.buildSessionCookie(session.token, session.expiresAt)
    );

    return {
      user: session.user
    };
  }

  @HttpCode(200)
  @Post("auth/login")
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({
    key: "auth-login",
    limit: 10,
    windowSeconds: 60 * 15,
    identifierField: "email",
    identifierLimit: 5,
    identifierWindowSeconds: 60 * 15
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: { setHeader(name: string, value: string): void }
  ) {
    const session = await this.authService.login(loginDto);
    response.setHeader(
      "Set-Cookie",
      this.sessionService.buildSessionCookie(session.token, session.expiresAt)
    );

    return {
      user: session.user
    };
  }

  @HttpCode(204)
  @Post("auth/password-reset/request")
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({
    key: "auth-password-reset-request",
    limit: 5,
    windowSeconds: 60 * 15,
    identifierField: "email",
    identifierLimit: 3,
    identifierWindowSeconds: 60 * 15
  })
  async requestPasswordReset(@Body() requestDto: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(requestDto);
  }

  @HttpCode(204)
  @Post("auth/password-reset/confirm")
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({ key: "auth-password-reset-confirm", limit: 5, windowSeconds: 60 * 15 })
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetDto);
  }

  @UseGuards(AuthGuard)
  @Post("auth/logout")
  @HttpCode(204)
  async logout(
    @Req() request: { headers: Record<string, string | string[] | undefined> },
    @CurrentUserDecorator() _currentUser: CurrentUser,
    @Res({ passthrough: true }) response: { setHeader(name: string, value: string): void }
  ) {
    await this.authService.logoutFromHeaders(request.headers);
    response.setHeader("Set-Cookie", this.sessionService.clearSessionCookie());
  }

  @UseGuards(AuthGuard)
  @Get("auth/me")
  getProfile(@CurrentUserDecorator() currentUser: CurrentUser) {
    return { user: currentUser };
  }

  @UseGuards(AuthGuard, AppRoleGuard)
  @RequireAppRoles(AppRole.ADMIN)
  @Get("users")
  async listUsers() {
    return {
      users: await this.authService.listUsers()
    };
  }

  @UseGuards(AuthGuard, AppRoleGuard)
  @RequireAppRoles(AppRole.ADMIN)
  @Patch("users/:userId/role")
  async updateUserRole(
    @Param("userId") userId: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() body: UpdateUserRoleDto
  ) {
    return {
      user: await this.authService.updateUserRole(currentUser, userId, body.appRole)
    };
  }
}
