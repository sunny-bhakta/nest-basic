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
    .setTitle('NestJS Events & Guards Demo API')
    .setDescription(`
      🚀 **Comprehensive NestJS Application** demonstrating advanced patterns and best practices:
      
      ## 🎪 Core Features
      - **🛡️ Guards**: Bearer Token authentication, User Access control, Role-based authorization
      - **🎯 Interceptors**: Cache, Rate Limit, Timeout, Security, Performance monitoring  
      - **🎪 Events System**: 13+ lifecycle events with EventEmitter2 integration
      - **🚰 Pipes**: Validation, Transform, Business Logic, Security sanitization
      - **🎭 Exception Filters**: Global, Custom, Validation, HTTP error handling
      - **📊 Middleware**: Request lifecycle tracking, Security headers, Rate limiting
      
      ## 🔧 Available Controllers
      - **Demo Controller** (/demo): Test endpoints for events system demonstration
      - **Security Controller** (/auth): Authentication and authorization endpoints  
      - **Catalog Controller** (/catalog): Advanced catalog management with pipes/interceptors
      - **Admin Controller** (/admin/interceptors): System administration and cache management
      
      ## 🎯 Testing Guide
      1. **Get Bearer Token**: Use /auth/login with credentials (admin/admin123, premium/premium123, standard/standard123)
      2. **Test Events**: Use /demo endpoints to generate and monitor lifecycle events
      3. **Monitor Performance**: Use /admin/interceptors endpoints for system metrics
      4. **Advanced Features**: Explore /catalog endpoints for complex pipe/interceptor usage
      
      ## 🔍 Event Monitoring
      All requests generate detailed console logs showing lifecycle events, performance metrics, and system health.
    `)
    .setVersion('2.0')
    .addTag('Demo', '🎪 Test endpoints for events system demonstration')
    .addTag('Security', '🛡️ Authentication and authorization endpoints')
    .addTag('Catalog', '📚 Advanced catalog management with pipes and interceptors')
    .addTag('Admin - Interceptor Management', '⚙️ System administration and performance monitoring (Admin only)')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT Authentication',
      description: 'Enter JWT Bearer token obtained from /auth/login endpoint',
      in: 'header',
    })
    .addServer('http://localhost:3000', 'Development Server')
    .setContact('NestJS Demo', 'https://nestjs.com', 'support@nestjs.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);

  console.log('🚀 Guards Demo API is running on: http://localhost:3000');
  console.log('📚 API Documentation: http://localhost:3000/api');

}
bootstrap();
