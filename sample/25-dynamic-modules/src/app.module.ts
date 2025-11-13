import { Module } from '@nestjs/common';
import { CustomDynamicModule } from './customdynamicmodule/customdynamicmodule.module';
import { AppController } from './app.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    CustomDynamicModule.forRoot({ "forRootProvider": 'From Root Provider' }),
    CustomDynamicModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const content = configService.get<string>('FOR_ROOT_ASYNC_PROVIDER') || 'From Root Async Provider';
        return {
          "forRootAsyncProvider": content,
        };
      },
    }),
    UsersModule
  ],
  controllers: [AppController],
})
export class AppModule { }
