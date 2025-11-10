import { Module } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppController } from './app.controller';
import { AppModuleRefService } from './app-module-ref.service';
import { CatsModule } from './cats/cats.module';
import { TasksModule } from './tasks/tasks.module';
// import { Custom } from './custom/custom';
import { AppService } from './app.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './logging/logging.interceptor';
import { TasksService } from './tasks/tasks.service';

@Module({
  imports: [
    // Dynamic CatsModule with custom configuration
    CatsModule.forRoot({
      defaultCats: [
        { name: 'Whiskers', age: 2 },
        { name: 'Luna', age: 3 },
        { name: 'Shadow', age: 1 },
      ],
      storageType: 'memory',
      maxCats: 10,
      enableLogging: true,
    }),
    TasksModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppModuleRefService,
    TasksService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
