import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { CurrentUser } from "../current-user.interface";

export const CurrentUserDecorator = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUser | undefined => {
    const request = context.switchToHttp().getRequest<{ currentUser?: CurrentUser }>();
    return request.currentUser;
  }
);
