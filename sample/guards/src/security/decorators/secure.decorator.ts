import { applyDecorators, UseGuards } from "@nestjs/common";
import { BearerTokenGuard } from "../guards/bearer-token.guard";
import { UserAccessGuard } from "../guards/user-access.guard";
import { AccessLevel } from "../../enums/access-level.enum";
import { RequireAccessLevel } from "./access-level.decorator";

export function SecureEndpoint(accessLevel?: AccessLevel) {
    const decorators = [
        UseGuards(BearerTokenGuard, UserAccessGuard),
    ]

    if ( accessLevel) {
        decorators.push(RequireAccessLevel(accessLevel));
    }

    return applyDecorators(...decorators);

}