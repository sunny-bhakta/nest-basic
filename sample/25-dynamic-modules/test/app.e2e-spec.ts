import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('NestJS Dynamic Modules (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('App Controller - Dynamic Module Root Providers', () => {
    it('/for-root (GET) - should return forRoot provider value', () => {
      return request(app.getHttpServer())
        .get('/for-root')
        .expect(200)
        .expect({ forRootProvider: 'From Root Provider' });
    });

    it('/for-root-async (GET) - should return forRootAsync provider value', () => {
      return request(app.getHttpServer())
        .get('/for-root-async')
        .expect(200)
        .expect({ forRootAsyncProvider: 'From Root Async Provider' });
    });

    it('/check-provider-export-in-dynamic-module (GET) - should return exported service response', () => {
      return request(app.getHttpServer())
        .get('/check-provider-export-in-dynamic-module')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('checkProviderExportInDynamicModule');
          expect(res.body.checkProviderExportInDynamicModule).toBe('This is from CustomDynamicModuleService');
        });
    });
  });

  describe('Users Controller - Dynamic Module Feature Providers', () => {
    it('/for-feature (GET) - should return forFeature provider value', () => {
      return request(app.getHttpServer())
        .get('/for-feature')
        .expect(200)
        .expect({ forFeatureProvider: 'From For Feature Module' });
    });

    it('/for-feature-async (GET) - should return forFeatureAsync provider value', () => {
      return request(app.getHttpServer())
        .get('/for-feature-async')
        .expect(200)
        .expect({ forFeatureAsyncProvider: 'From Feature Async Module' });
    });

    it('/use-class (GET) - should return greeting from useClass provider', () => {
      return request(app.getHttpServer())
        .get('/use-class')
        .expect(200)
        .expect({ useClass: 'Hallo! de.' });
    });

    it('/use-existing (GET) - should demonstrate useExisting provider sharing same instance', () => {
      return request(app.getHttpServer())
        .get('/use-existing')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('default');
          expect(res.body).toHaveProperty('use_existing');
          expect(res.body.default).toEqual('Hello from UsersService!');
          expect(res.body.use_existing).toEqual('Hello from UsersService!');
        });
    });
  });

  describe('Dynamic Module Integration', () => {
    it('should handle multiple dynamic module configurations in same app', async () => {
      const forRootResponse = await request(app.getHttpServer())
        .get('/for-root')
        .expect(200);

      const forFeatureResponse = await request(app.getHttpServer())
        .get('/for-feature')
        .expect(200);

      expect(JSON.parse(forRootResponse.text)).toEqual({ forRootProvider: 'From Root Provider' });
      expect(JSON.parse(forFeatureResponse.text)).toEqual({ forFeatureProvider: 'From For Feature Module' });
    });

    it('should handle async configuration for both root and feature modules', async () => {
      const forRootAsyncResponse = await request(app.getHttpServer())
        .get('/for-root-async')
        .expect(200);

      const forFeatureAsyncResponse = await request(app.getHttpServer())
        .get('/for-feature-async')
        .expect(200);

      expect(JSON.parse(forRootAsyncResponse.text)).toEqual({ forRootAsyncProvider: 'From Root Async Provider' });
      expect(JSON.parse(forFeatureAsyncResponse.text)).toEqual({ forFeatureAsyncProvider: 'From Feature Async Module' });
    });

    it('should properly inject custom providers from dynamic modules', async () => {
      const serviceResponse = await request(app.getHttpServer())
        .get('/check-provider-export-in-dynamic-module')
        .expect(200);

      expect(serviceResponse.body.checkProviderExportInDynamicModule).toBe('This is from CustomDynamicModuleService');

      const languageResponse = await request(app.getHttpServer())
        .get('/use-class')
        .expect(200);

      expect(JSON.parse(languageResponse.text)).toEqual({ useClass: 'Hallo! de.' });
    });

    it('should demonstrate provider scoping and sharing', async () => {
      const useExistingResponse = await request(app.getHttpServer())
        .get('/use-existing')
        .expect(200);

      expect(useExistingResponse.body.default).toBe('Hello from UsersService!');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid routes gracefully', () => {
      return request(app.getHttpServer())
        .get('/non-existent-route')
        .expect(404);
    });
  });

  describe('Application Health and Performance', () => {
    it('should respond to multiple concurrent requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => request(app.getHttpServer()).get('/for-root').expect(200));

      const responses = await Promise.all(requests);
      responses.forEach((response) => {
        expect(JSON.parse(response.text)).toEqual({ forRootProvider: 'From Root Provider' });
      });
    });
  });

  describe('Dynamic Module Provider Types', () => {
    it('should correctly handle useClass provider pattern', () => {
      return request(app.getHttpServer())
        .get('/use-class')
        .expect(200)
        .expect({ useClass: 'Hallo! de.' });
    });
  });
});
