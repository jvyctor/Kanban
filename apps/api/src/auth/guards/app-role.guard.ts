import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AppRole } from "@prisma/client";
import { CurrentUser } from "../current-user.interface";
import { APP_ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class AppRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredRoles =
      this.reflector.getAllAndOverride<AppRole[]>(APP_ROLES_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ currentUser?: CurrentUser }>();
    const currentUser = request.currentUser;

    if (!currentUser) {
      throw new ForbiddenException("Authentication context missing");
    }

    if (!requiredRoles.includes(currentUser.appRole)) {
      throw new ForbiddenException("Insufficient role");
    }

    return true;
  }
}
