import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('NestJS Cats API')
    .setDescription(`
      A comprehensive NestJS API demonstrating advanced concepts including:
      
      ## Features
      - **Dynamic Modules**: Configurable modules with forRoot/forRootAsync patterns
      - **ModuleRef**: Runtime provider access and dependency injection
      - **Pagination**: Advanced pagination with page/skip/limit support
      - **Multi-field Sorting**: Priority-based sorting with multiple criteria
      - **Validation**: Custom validation pipes and error handling
      - **Guards & Interceptors**: Role-based authentication and logging
      - **Exception Filters**: Custom error response formatting
      
      ## API Organization
      - **Application**: Basic app endpoints and ModuleRef demonstrations
      - **Cats**: Core CRUD operations with advanced features
      - **Cats - Pagination Examples**: Comprehensive pagination and sorting examples
      
      ## Query Parameters
      - **Pagination**: \`page\`, \`limit\`, \`skip\`
      - **Sorting**: \`sort\` (format: "field:order", can be repeated)
      - **Search**: \`q\` for text search
      - **Filtering**: \`minAge\`, \`maxAge\` for range filters
      
      ## Example Usage
      \`\`\`
      GET /cats/paginated?page=1&limit=10
      GET /cats/multi-sorted?sort=age:desc&sort=name:asc&page=1&limit=5
      GET /cats/search?q=fluffy&page=1&limit=10
      GET /cats/age-range?minAge=1&maxAge=5&page=1&limit=10
      \`\`\`
    `)
    .setVersion('1.0.0')
    .setContact(
      'NestJS Demo API',
      'https://nestjs.com',
      'support@nestjs.com'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addTag('Application', 'Basic application endpoints and ModuleRef demonstrations')
    .addTag('Cats', 'Cat management with CRUD, pagination, sorting, and filtering')
    .addTag('Cats - Pagination Examples', 'Advanced pagination and sorting examples')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addServer('http://localhost:4000', 'Development server')
    .addServer('http://localhost:3000', 'Alternative development server')
    .build();
    
  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    deepScanRoutes: true,
  });
  
  // Custom Swagger UI options
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      syntaxHighlight: {
        theme: 'arta'
      },
      tryItOutEnabled: true,
    },
    customSiteTitle: 'NestJS Cats API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
  });
  
  await app.listen(4000);
}
bootstrap();
