import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SecurityService } from "../security.service";
import { SKIP_AUTH_KEY } from "../decorators/skip-auth.decorator";

@Injectable()
export class BearerTokenGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly securityService: SecurityService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const skipAuth = this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (skipAuth) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException("Invalid or expired token a");
        }

        console.log('Extracted Bearer token:', token);
        try {
            const user = await this.securityService.validateToken(token);
            request.user = user;
            
            // Update request context with user info if available
            if (request.context) {
                request.context.user = {
                    id: user.id,
                    username: user.username,
                    accessLevel: user.accessLevel,
                };
            }
            
            return true;
        } catch (error) {
            throw new UnauthorizedException("Invalid or expired token b");
        }
    }

    private extractTokenFromHeader(request: any): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}

