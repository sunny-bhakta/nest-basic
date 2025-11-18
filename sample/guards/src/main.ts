import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { 
  GlobalExceptionFilter,
  CustomExceptionFilter,
  ValidationExceptionFilter,
  HttpExceptionFilter,
} from './filters';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure global pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Configure global exception filters (order matters - most specific first)
  app.useGlobalFilters(
    new CustomExceptionFilter(),        // 1st: Handle custom business logic exceptions
    new ValidationExceptionFilter(),    // 2nd: Handle validation errors
    new HttpExceptionFilter(),          // 3rd: Handle HTTP exceptions
    new GlobalExceptionFilter(),        // 4th: Catch-all for unexpected errors
  );

  const config = new DocumentBuilder()
    .setTitle('Guards Example')
    .setDescription('Guards example application demonstrating ModuleRef usage')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);

  console.log('🚀 Guards Demo API is running on: http://localhost:3000');
  console.log('📚 API Documentation: http://localhost:3000/api');

}
bootstrap();
