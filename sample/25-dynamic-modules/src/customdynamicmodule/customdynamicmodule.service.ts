import { Injectable } from "@nestjs/common";

@Injectable()
export class CustomDynamicModuleService {
    constructor() { }

    checkProviderExportInDynamicModule(): string {
        return "This is from CustomDynamicModuleService";
    }
}
