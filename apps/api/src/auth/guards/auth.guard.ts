import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { CurrentUser } from "../current-user.interface";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      currentUser?: CurrentUser;
    }>();

    const currentUser = await this.authService.getCurrentUserFromHeaders(request.headers);

    if (!currentUser) {
      throw new UnauthorizedException("Authentication required");
    }

    request.currentUser = currentUser;
    return true;
  }
}
