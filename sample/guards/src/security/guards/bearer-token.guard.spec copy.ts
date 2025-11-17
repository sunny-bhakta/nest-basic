import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BearerTokenGuard } from './bearer-token.guard';
import { SecurityService } from '../security.service';
import { SKIP_AUTH_KEY } from '../decorators/skip-auth.decorator';

describe.skip('BearerTokenGuard', () => {
  let guard: BearerTokenGuard;
  let reflector: Reflector;
  let securityService: SecurityService;
  let mockExecutionContext: ExecutionContext;

  const mockUser = {
    id: 1,
    username: 'testuser',
    accessLevel: 'STANDARD',
    tokenIssuedAt: new Date(),
  };

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
    reflector = module.get<Reflector>(Reflector);
    securityService = module.get<SecurityService>(SecurityService);

    // Mock ExecutionContext
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
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    describe('when @SkipAuth decorator is present', () => {
      it('should return true and skip authentication', async () => {
        // Arrange
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

        // Act
        const result = await guard.canActivate(mockExecutionContext);

        // Assert
        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(SKIP_AUTH_KEY, [
          mockExecutionContext.getHandler(),
          mockExecutionContext.getClass(),
        ]);
        expect(securityService.validateToken).not.toHaveBeenCalled();
      });
    });

    describe('when @SkipAuth decorator is not present', () => {
      beforeEach(() => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      });

      it('should throw UnauthorizedException when no authorization header is provided', async () => {
        // Arrange
        const mockRequest = { headers: {} };
        mockExecutionContext.switchToHttp().getRequest = jest.fn().mockReturnValue(mockRequest);

        // Act & Assert
        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          new UnauthorizedException('Invalid or expired token a')
        );
        expect(securityService.validateToken).not.toHaveBeenCalled();
      });

      it('should throw UnauthorizedException when authorization header is malformed', async () => {
        // Arrange
        const mockRequest = { 
          headers: { 
            authorization: 'InvalidFormat' 
          } 
        };
        mockExecutionContext.switchToHttp().getRequest = jest.fn().mockReturnValue(mockRequest);

        // Act & Assert
        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          new UnauthorizedException('Invalid or expired token a')
        );
        expect(securityService.validateToken).not.toHaveBeenCalled();
      });

      it('should throw UnauthorizedException when token type is not Bearer', async () => {
        // Arrange
        const mockRequest = { 
          headers: { 
            authorization: 'Basic username:password' 
          } 
        };
        mockExecutionContext.switchToHttp().getRequest = jest.fn().mockReturnValue(mockRequest);

        // Act & Assert
        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          new UnauthorizedException('Invalid or expired token a')
        );
        expect(securityService.validateToken).not.toHaveBeenCalled();
      });

      it('should return true and attach user to request when valid Bearer token is provided', async () => {
        // Arrange
        const validToken = 'valid-token-123';
        const mockRequest = { 
          headers: { 
            authorization: `Bearer ${validToken}` 
          },
          user: undefined
        };
        mockExecutionContext.switchToHttp().getRequest = jest.fn().mockReturnValue(mockRequest);
        jest.spyOn(securityService, 'validateToken').mockResolvedValue(mockUser);

        // Act
        const result = await guard.canActivate(mockExecutionContext);

        // Assert
        expect(result).toBe(true);
        expect(securityService.validateToken).toHaveBeenCalledWith(validToken);
        expect(mockRequest.user).toEqual(mockUser);
      });

      it('should throw UnauthorizedException when SecurityService throws an error', async () => {
        // Arrange
        const invalidToken = 'invalid-token';
        const mockRequest = { 
          headers: { 
            authorization: `Bearer ${invalidToken}` 
          } 
        };
        mockExecutionContext.switchToHttp().getRequest = jest.fn().mockReturnValue(mockRequest);
        jest.spyOn(securityService, 'validateToken').mockRejectedValue(new Error('Invalid token'));

        // Act & Assert
        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          new UnauthorizedException('Invalid or expired token b')
        );
        expect(securityService.validateToken).toHaveBeenCalledWith(invalidToken);
      });

      it('should handle case-insensitive Bearer token', async () => {
        // Arrange
        const validToken = 'valid-token-123';
        const mockRequest = { 
          headers: { 
            authorization: `bearer ${validToken}` // lowercase 'bearer'
          },
          user: undefined
        };
        mockExecutionContext.switchToHttp().getRequest = jest.fn().mockReturnValue(mockRequest);
        jest.spyOn(securityService, 'validateToken').mockResolvedValue(mockUser);

        // Act
        const result = await guard.canActivate(mockExecutionContext);

        // Assert
        expect(result).toBe(false); // Should fail because guard expects 'Bearer' (capital B)
      });

      it('should handle authorization header with extra spaces', async () => {
        // Arrange
        const validToken = 'valid-token-123';
        const mockRequest = { 
          headers: { 
            authorization: `  Bearer   ${validToken}  ` 
          },
          user: undefined
        };
        mockExecutionContext.switchToHttp().getRequest = jest.fn().mockReturnValue(mockRequest);

        // Act & Assert
        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          new UnauthorizedException('Invalid or expired token a')
        );
      });
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer authorization header', () => {
      // Arrange
      const token = 'abc123xyz';
      const mockRequest = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      // Act
      const extractedToken = guard['extractTokenFromHeader'](mockRequest);

      // Assert
      expect(extractedToken).toBe(token);
    });

    it('should return undefined when no authorization header is present', () => {
      // Arrange
      const mockRequest = { headers: {} };

      // Act
      const extractedToken = guard['extractTokenFromHeader'](mockRequest);

      // Assert
      expect(extractedToken).toBeUndefined();
    });

    it('should return undefined when authorization header is not Bearer type', () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: 'Basic dXNlcjpwYXNz'
        }
      };

      // Act
      const extractedToken = guard['extractTokenFromHeader'](mockRequest);

      // Assert
      expect(extractedToken).toBeUndefined();
    });

    it('should return undefined when authorization header is malformed', () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: 'Bearer'
        }
      };

      // Act
      const extractedToken = guard['extractTokenFromHeader'](mockRequest);

      // Assert
      expect(extractedToken).toBeUndefined();
    });

    it('should handle multiple spaces in authorization header', () => {
      // Arrange
      const token = 'abc123xyz';
      const mockRequest = {
        headers: {
          authorization: `Bearer    ${token}`
        }
      };

      // Act
      const extractedToken = guard['extractTokenFromHeader'](mockRequest);

      // Assert
      expect(extractedToken).toBe(`   ${token}`); // Will include the extra spaces
    });
  });

    describe('integration scenarios', () => {
      it('should handle complete authentication flow for valid request', async () => {
      // Arrange
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

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(SKIP_AUTH_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
      expect(securityService.validateToken).toHaveBeenCalledWith(validToken);
      expect(mockRequest.user).toEqual(mockUser);
      expect(result).toBe(true);
    });

    it('should prioritize @SkipAuth over token validation', async () => {
      // Arrange
      const mockRequest = { headers: {} }; // No auth header
      mockExecutionContext.switchToHttp().getRequest = jest.fn().mockReturnValue(mockRequest);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true); // @SkipAuth present

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(securityService.validateToken).not.toHaveBeenCalled();
    });
  });
});
