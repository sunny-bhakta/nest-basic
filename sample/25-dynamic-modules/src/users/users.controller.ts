import { Controller, Get, Inject } from "@nestjs/common";
import { UsersService } from "./user.service";

@Controller()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject('FOR_FEATURE_PROVIDER') private readonly forFeatureProvider: string,
    @Inject('FOR_FEATURE_ASYNC_PROVIDER') private readonly forFeatureAsyncProvider: any,
    @Inject('USE_EXISTING_PROVIDER') private readonly useExistingProvider: any,
    @Inject('USE_CLASS_PROVIDER') private readonly useClassProvider: any,
  ) {}

  @Get('for-feature')
  getForFeatureMessage(): string {
    return this.forFeatureProvider;
  }

  @Get('for-feature-async')
  getForFeatureAsyncMessage(): any {
    return this.forFeatureAsyncProvider ?? null;

  }

  @Get('use-class')
  useClassMessage(): any {
    return this.useClassProvider.useClassGreetByLanguage("de");
  }

  @Get('use-existing')
  sameInstaceButDifferentToken(): any {
    return {
        "default": this.usersService.sayHello(),
        "use_existing": this.useExistingProvider.sayHello(),
    };
  }
}