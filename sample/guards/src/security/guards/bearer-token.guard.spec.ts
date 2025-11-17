import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BearerTokenGuard } from './bearer-token.guard';
import { SecurityService } from '../security.service';
import { SKIP_AUTH_KEY } from '../decorators/skip-auth.decorator';
import { AccessLevel } from '../../enums/access-level.enum';

describe('BearerTokenGuard', () => {
  let guard: BearerTokenGuard;
  let securityService: SecurityService;
  let reflector: Reflector;
  let mockExecutionContext: ExecutionContext

  const mockUser = {
    id: 1,
    username: 'testuser',
    AccessLevel: AccessLevel.STANDARD,
    tokenIssuedAt: new Date(),
  }


  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BearerTokenGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: SecurityService,
          useValue: {
            validateToken: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<BearerTokenGuard>(BearerTokenGuard);
    securityService = module.get<SecurityService>(SecurityService);
    reflector = module.get<Reflector>(Reflector);
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: {},
          user: undefined,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('guard should be defined', () => {
      expect(guard).toBeDefined();
    });

    describe('when SKIP_AUTH_KEY decorator is present', () => {
      it('should skip authentication if SKIP_AUTH_KEY is set', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(SKIP_AUTH_KEY, [
          mockExecutionContext.getHandler(),
          mockExecutionContext.getClass(),
        ]);
        expect(securityService.validateToken).not.toHaveBeenCalled();
      });
    });

    describe('when @SkipAuth decorator is absent', () => {
      beforeEach(() => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      });

      it('should throw UnauthorizedException if Authorization header is missing', async () => {
        const mockRequest = { headers: {} };
        mockExecutionContext.switchToHttp().getRequest = jest.fn().mockReturnValue(mockRequest);

        expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(UnauthorizedException);
        expect(securityService.validateToken).not.toHaveBeenCalled();
      });

      it('attach user to request if bearer token is valid', async () => {
        const validToken = 'valid-bearer-token';
        const mockRequest = {
          headers: { authorization: `Bearer ${validToken}` },
          user: undefined,
        };

        mockExecutionContext.switchToHttp().getRequest = jest.fn().mockReturnValue(mockRequest);
        jest.spyOn(securityService, 'validateToken').mockResolvedValue(mockUser);


        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(securityService.validateToken).toHaveBeenCalledWith(validToken);
        expect(mockRequest.user).toEqual(mockUser);
      });
    });

    describe('extractTokenFromHeader', () => {
      it('should return undefined when authorization header is malformed', () => {
        const mockRequest = {
          headers: {
            authorization: 'Bearer'
          }
        };

      const extractedToken = guard['extractTokenFromHeader'](mockRequest);
      expect(extractedToken).toBeUndefined();
      });
    });



  });

  describe('integration scenarios', () => {
    it('should handle complete authentication flow for valid request', async () => {
      const validToken = 'integration-test-token';
      const mockRequest = {
        headers: {
          authorization: `Bearer ${validToken}`
        },
        user: undefined
      };
      mockExecutionContext.switchToHttp().getRequest = jest.fn().mockReturnValue(mockRequest);

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(securityService, 'validateToken').mockResolvedValue(mockUser);

      const result = await guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(SKIP_AUTH_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
      expect(securityService.validateToken).toHaveBeenCalledWith(validToken);
      expect(mockRequest.user).toEqual(mockUser);
      expect(result).toBe(true);
    });

    it('should prioritize @SkipAuth over token validation', async () => {
      const mockRequest = { headers: {} }; // No auth header
      mockExecutionContext.switchToHttp().getRequest = jest.fn().mockReturnValue(mockRequest);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true); // @SkipAuth present

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(securityService.validateToken).not.toHaveBeenCalled();
    });
  });
});
