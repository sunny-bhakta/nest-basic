import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { LifecycleEventEmitter } from '../lifecycle-event-emitter.service';
import { AccessLevel } from '../../enums/access-level.enum';

interface ExtendedRequest extends Request {
  user?: {
    id?: string;
    accessLevel?: AccessLevel;
    roles?: string[];
    permissions?: string[];
  };
}

/**
 * Enhanced authorization guard that integrates with lifecycle events
 * Emits detailed authorization events for monitoring and auditing
 */
@Injectable()
export class LifecycleAuthzGuard implements CanActivate {
  private readonly logger = new Logger(LifecycleAuthzGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly eventEmitter: LifecycleEventEmitter,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ExtendedRequest>();
    const handler = context.getHandler();
    const controller = context.getClass();
    
    const requestId = request['requestId'] || 'unknown';
    const startTime = Date.now();
    
    // Get required access level from decorator
    const requiredAccessLevel = this.reflector.getAllAndOverride<AccessLevel>('access-level', [
      handler,
      controller,
    ]);

    // Get required permissions from decorator (if any)
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      handler,
      controller,
    ]);

    // Check if authentication is required
    const skipAuth = this.reflector.getAllAndOverride<boolean>('skip-auth', [
      handler,
      controller,
    ]);

    const resource = this.getResourceName(request);
    
    // Emit authorization check event
    this.eventEmitter.emitAuthzEvent({
      requestId,
      ip: this.getClientIP(request),
      userAgent: request.get('User-Agent'),
      userId: request.user?.id,
      correlationId: request['correlationId'],
      sessionId: request['sessionId'],
      action: 'check',
      resource,
      permission: requiredPermissions?.join(', '),
      accessLevel: requiredAccessLevel,
    });

    // If auth is skipped, grant access
    if (skipAuth) {
      const duration = Date.now() - startTime;
      this.eventEmitter.emitAuthzEvent({
        requestId,
        ip: this.getClientIP(request),
        userAgent: request.get('User-Agent'),
        userId: request.user?.id,
        correlationId: request['correlationId'],
        sessionId: request['sessionId'],
        action: 'granted',
        resource,
        accessLevel: 'none',
        reason: 'authentication_skipped',
        duration,
      });
      return true;
    }

    // Check if user is authenticated
    if (!request.user) {
      const duration = Date.now() - startTime;
      this.eventEmitter.emitAuthzEvent({
        requestId,
        ip: this.getClientIP(request),
        userAgent: request.get('User-Agent'),
        correlationId: request['correlationId'],
        sessionId: request['sessionId'],
        action: 'denied',
        resource,
        reason: 'user_not_authenticated',
        duration,
      });
      return false;
    }

    // Check access level if required
    if (requiredAccessLevel) {
      const hasAccessLevel = this.checkAccessLevel(request.user.accessLevel, requiredAccessLevel);
      
      if (!hasAccessLevel) {
        const duration = Date.now() - startTime;
        this.eventEmitter.emitAuthzEvent({
          requestId,
          ip: this.getClientIP(request),
          userAgent: request.get('User-Agent'),
          userId: request.user.id,
          correlationId: request['correlationId'],
          sessionId: request['sessionId'],
          action: 'denied',
          resource,
          accessLevel: request.user.accessLevel,
          reason: `insufficient_access_level_required_${requiredAccessLevel}_has_${request.user.accessLevel}`,
          duration,
        });

        // Emit security event for potential privilege escalation
        this.eventEmitter.emitSecurityEvent({
          requestId,
          ip: this.getClientIP(request),
          userAgent: request.get('User-Agent'),
          userId: request.user.id,
          correlationId: request['correlationId'],
          sessionId: request['sessionId'],
          type: 'suspicious_activity',
          severity: 'medium',
          details: {
            attempts: 1,
            threshold: 1,
            blocked: true,
          },
          action: 'blocked',
        });

        return false;
      }
    }

    // Check specific permissions if required
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermissions = this.checkPermissions(request.user.permissions || [], requiredPermissions);
      
      if (!hasPermissions) {
        const duration = Date.now() - startTime;
        this.eventEmitter.emitAuthzEvent({
          requestId,
          ip: this.getClientIP(request),
          userAgent: request.get('User-Agent'),
          userId: request.user.id,
          correlationId: request['correlationId'],
          sessionId: request['sessionId'],
          action: 'denied',
          resource,
          permission: requiredPermissions.join(', '),
          accessLevel: request.user.accessLevel,
          reason: `missing_permissions_required_${requiredPermissions.join('_')}_has_${(request.user.permissions || []).join('_')}`,
          duration,
        });
        return false;
      }
    }

    // Access granted
    const duration = Date.now() - startTime;
    this.eventEmitter.emitAuthzEvent({
      requestId,
      ip: this.getClientIP(request),
      userAgent: request.get('User-Agent'),
      userId: request.user.id,
      correlationId: request['correlationId'],
      sessionId: request['sessionId'],
      action: 'granted',
      resource,
      permission: requiredPermissions?.join(', '),
      accessLevel: request.user.accessLevel,
      duration,
    });

    return true;
  }

  private checkAccessLevel(userAccessLevel?: AccessLevel, requiredAccessLevel?: AccessLevel): boolean {
    if (!requiredAccessLevel) return true;
    if (!userAccessLevel) return false;

    const accessLevels = {
      [AccessLevel.GUEST]: 0,
      [AccessLevel.STANDARD]: 1,
      [AccessLevel.PREMIUM]: 2,
      [AccessLevel.ADMIN]: 3,
    };

    return accessLevels[userAccessLevel] >= accessLevels[requiredAccessLevel];
  }

  private checkPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every(permission => 
      userPermissions.includes(permission) || userPermissions.includes('*')
    );
  }

  private getResourceName(request: ExtendedRequest): string {
    const pathParts = request.path.split('/').filter(Boolean);
    const method = request.method.toLowerCase();
    
    if (pathParts.length > 0) {
      return `${method}:/${pathParts.join('/')}`;
    }
    
    return `${method}:/`;
  }

  private getClientIP(request: ExtendedRequest): string {
    return (
      request.headers['x-forwarded-for'] as string ||
      request.headers['x-real-ip'] as string ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}