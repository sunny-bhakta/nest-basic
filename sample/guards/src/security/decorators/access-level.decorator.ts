import { SetMetadata } from "@nestjs/common";
import { AccessLevel } from "../../enums/access-level.enum";

export const ACCESS_LEVEL_KEY = 'accessLevel';
export const RequireAccessLevel = (level: AccessLevel) => {
    return SetMetadata(ACCESS_LEVEL_KEY, level);
}
