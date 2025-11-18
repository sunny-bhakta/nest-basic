import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AccessLevel } from "../../enums/access-level.enum";
import { ACCESS_LEVEL_KEY } from "../decorators/access-level.decorator";

@Injectable()
export class UserAccessGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredAccessLevel = this.reflector.getAllAndOverride<AccessLevel>(ACCESS_LEVEL_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredAccessLevel) {
            return true; 
        }

        const user = await context.switchToHttp().getRequest().user;
        if (!user) {
            throw new ForbiddenException("User authentication required");
        }

        if (!this.hasRequiredAccess(user.accessLevel, requiredAccessLevel)) {
            throw new ForbiddenException(`Access level '${requiredAccessLevel}' required`);
        }

        return true;
    }

    private hasRequiredAccess(userLevel: AccessLevel, requiredLevel: AccessLevel): boolean {
        const levels = Object.values(AccessLevel);
        const userLevelIndex = levels.indexOf(userLevel);
        const requiredLevelIndex = levels.indexOf(requiredLevel);

        return userLevelIndex >= requiredLevelIndex;
    }


}