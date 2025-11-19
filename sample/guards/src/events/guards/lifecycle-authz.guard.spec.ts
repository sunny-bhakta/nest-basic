import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { LifecycleAuthzGuard } from '../guards/lifecycle-authz.guard';
import { LifecycleEventEmitter } from '../lifecycle-event-emitter.service';

describe('LifecycleAuthzGuard', () => {
  let guard: LifecycleAuthzGuard;
  let mockEventEmitter: jest.Mocked<LifecycleEventEmitter>;
  let mockReflector: jest.Mocked<Reflector>;
  let mockExecutionContext: ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifecycleAuthzGuard,
        {
          provide: LifecycleEventEmitter,
          useValue: {
            emitAuthzEvent: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<LifecycleAuthzGuard>(LifecycleAuthzGuard);
    mockEventEmitter = module.get(LifecycleEventEmitter);
    mockReflector = module.get(Reflector);

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          requestId: 'req-123',
          ip: '192.168.1.1',
          user: {
            id: 'user-456',
            accessLevel: 'STANDARD',
            permissions: ['user:read', 'user:write'],
          },
          method: 'GET',
          url: '/api/users',
        }),
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authorization Logic', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should allow access when no access level is required', async () => {
      mockReflector.get.mockReturnValue(undefined);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockEventEmitter.emitAuthzEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'granted',
          requestId: 'req-123',
          userId: 'user-456',
          resource: 'GET:/api/users',
        })
      );
    });

    it('should allow access when user has sufficient access level', async () => {
      mockReflector.get
        .mockReturnValueOnce('STANDARD') // ACCESS_LEVEL_KEY
        .mockReturnValueOnce(undefined); // PERMISSIONS_KEY

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockEventEmitter.emitAuthzEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'granted',
          accessLevel: 'STANDARD',
        })
      );
    });

    it('should deny access when user has insufficient access level', async () => {
      mockReflector.get
        .mockReturnValueOnce('ADMIN') // ACCESS_LEVEL_KEY
        .mockReturnValueOnce(undefined); // PERMISSIONS_KEY

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
      expect(mockEventEmitter.emitAuthzEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'denied',
          accessLevel: 'STANDARD',
          reason: expect.stringContaining('Insufficient access level'),
        })
      );
    });

    it('should allow access when user has required permissions', async () => {
      mockReflector.get
        .mockReturnValueOnce(undefined) // ACCESS_LEVEL_KEY
        .mockReturnValueOnce(['user:read']); // PERMISSIONS_KEY

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockEventEmitter.emitAuthzEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'granted',
          permission: 'user:read',
        })
      );
    });

    it('should deny access when user lacks required permissions', async () => {
      mockReflector.get
        .mockReturnValueOnce(undefined) // ACCESS_LEVEL_KEY
        .mockReturnValueOnce(['admin:delete']); // PERMISSIONS_KEY

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
      expect(mockEventEmitter.emitAuthzEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'denied',
          permission: 'admin:delete',
          reason: expect.stringContaining('Missing required permission'),
        })
      );
    });

    it('should handle requests without user context', async () => {
      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            requestId: 'req-123',
            ip: '192.168.1.1',
            method: 'GET',
            url: '/api/public',
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      mockReflector.get.mockReturnValue(undefined);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockEventEmitter.emitAuthzEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'granted',
          userId: undefined,
        })
      );
    });

    it('should deny access when user is missing but access level is required', async () => {
      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            requestId: 'req-123',
            ip: '192.168.1.1',
            method: 'GET',
            url: '/api/admin',
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      mockReflector.get
        .mockReturnValueOnce('ADMIN')
        .mockReturnValueOnce(undefined);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
      expect(mockEventEmitter.emitAuthzEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'denied',
          reason: expect.stringContaining('No user context'),
        })
      );
    });

    it('should emit authorization check event', async () => {
      mockReflector.get
        .mockReturnValueOnce('STANDARD')
        .mockReturnValueOnce(['user:read']);

      await guard.canActivate(mockExecutionContext);

      expect(mockEventEmitter.emitAuthzEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'check',
          requestId: 'req-123',
          resource: 'GET:/api/users',
        })
      );
    });

    it('should handle event emission errors gracefully', async () => {
      mockEventEmitter.emitAuthzEvent.mockImplementation(() => {
        throw new Error('Event emission failed');
      });

      mockReflector.get.mockReturnValue(undefined);

      expect(async () => {
        await guard.canActivate(mockExecutionContext);
      }).not.toThrow();
    });
  });

  describe('Access Level Validation', () => {
    it('should correctly compare access levels', () => {
      // Test the private method through type casting
      const hasValidAccessLevel = (guard as any).hasValidAccessLevel;

      expect(hasValidAccessLevel('ADMIN', 'ADMIN')).toBe(true);
      expect(hasValidAccessLevel('ADMIN', 'STANDARD')).toBe(true);
      expect(hasValidAccessLevel('ADMIN', 'GUEST')).toBe(true);
      expect(hasValidAccessLevel('STANDARD', 'ADMIN')).toBe(false);
      expect(hasValidAccessLevel('STANDARD', 'STANDARD')).toBe(true);
      expect(hasValidAccessLevel('GUEST', 'ADMIN')).toBe(false);
      expect(hasValidAccessLevel('GUEST', 'GUEST')).toBe(true);
    });
  });

  describe('Permission Validation', () => {
    it('should validate single permission correctly', () => {
      const hasPermission = (guard as any).hasPermission;

      expect(hasPermission(['user:read', 'user:write'], 'user:read')).toBe(true);
      expect(hasPermission(['user:read', 'user:write'], 'user:delete')).toBe(false);
      expect(hasPermission([], 'user:read')).toBe(false);
    });

    it('should validate multiple permissions correctly', () => {
      const hasAllPermissions = (guard as any).hasAllPermissions;

      expect(hasAllPermissions(['user:read', 'user:write', 'admin:read'], ['user:read', 'user:write'])).toBe(true);
      expect(hasAllPermissions(['user:read'], ['user:read', 'user:write'])).toBe(false);
      expect(hasAllPermissions(['user:read', 'user:write'], ['user:read'])).toBe(true);
    });
  });
});