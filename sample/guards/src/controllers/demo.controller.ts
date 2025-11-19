import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SkipAuth } from '../security/decorators/skip-auth.decorator';
import { SecureEndpoint } from '../security/decorators/secure.decorator';
import { AccessLevel } from '../enums/access-level.enum';
import { LifecycleEventEmitter } from '../events/lifecycle-event-emitter.service';
import { 
  UserDataDto, 
  BatchProcessDto, 
  CacheKeyDto,
  ProcessingResultDto,
  ValidationResultDto,
  ErrorResponseDto,
  HealthStatusDto 
} from './dto/demo.dto';

/**
 * Demo controller to test events system
 */
@ApiTags('Demo')
@Controller('demo')
export class DemoController {
  
  constructor(
    private readonly eventEmitter: LifecycleEventEmitter,
  ) {}

  /**
   * Public endpoint - will generate basic request lifecycle events
   */
  @ApiOperation({ 
    summary: 'Get public data',
    description: 'Public endpoint that generates basic request lifecycle events. No authentication required.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Public data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'This is public data - check logs for events!' },
        timestamp: { type: 'string', example: '2024-01-01T12:00:00.000Z' }
      }
    }
  })
  @SkipAuth()
  @Get('public')
  getPublicData() {
    return {
      message: 'This is public data - check logs for events!',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Protected endpoint - will generate auth + authz events
   */
  @ApiOperation({ 
    summary: 'Get protected data',
    description: 'Protected endpoint that generates authentication and authorization events. Requires valid bearer token.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Protected data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'This is protected data - authentication required!' },
        timestamp: { type: 'string', example: '2024-01-01T12:00:00.000Z' }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - missing or invalid bearer token',
    type: ErrorResponseDto
  })
  @SecureEndpoint()
  @Get('protected')
  getProtectedData() {
    return {
      message: 'This is protected data - authentication required!',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Admin endpoint - will generate access level events
   */
  @ApiOperation({ 
    summary: 'Get admin data',
    description: 'Admin-only endpoint that generates access level events. Requires admin bearer token.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Admin data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'This is admin data - admin access required!' },
        timestamp: { type: 'string', example: '2024-01-01T12:00:00.000Z' }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - missing or invalid bearer token',
    type: ErrorResponseDto
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - insufficient access level',
    type: ErrorResponseDto
  })
  @SecureEndpoint(AccessLevel.ADMIN)
  @Get('admin')
  getAdminData() {
    return {
      message: 'This is admin data - admin access required!',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Slow endpoint - will generate performance events
   */
  @ApiOperation({ 
    summary: 'Get slow data (simulates 2s delay)',
    description: 'Endpoint that simulates slow processing to generate performance events. Intentionally delayed for 2 seconds.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Slow data retrieved successfully after delay',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'This was a slow endpoint - check performance events!' },
        duration: { type: 'string', example: '2000ms' },
        timestamp: { type: 'string', example: '2024-01-01T12:00:00.000Z' }
      }
    }
  })
  @SkipAuth()
  @Get('slow')
  async getSlowData() {
    // Simulate slow processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      message: 'This was a slow endpoint - check performance events!',
      duration: '2000ms',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Custom event endpoint - manually emit processing events
   */
  @ApiOperation({ 
    summary: 'Emit custom processing event',
    description: 'Manually emit a custom processing event to demonstrate event system functionality.' 
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Custom processing message' }
      },
      required: ['message']
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Custom event emitted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Custom processing event emitted successfully!' },
        data: { 
          type: 'object',
          example: { message: 'Custom processing message' }
        }
      }
    }
  })
  @SkipAuth()
  @Post('custom-event')
  async emitCustomEvent(@Body() data: { message: string }) {
    // Manually emit a processing event
    this.eventEmitter.emitProcessingEvent({
      requestId: `custom-${Date.now()}`,
      action: 'complete',
      controller: 'DemoController',
      handler: 'emitCustomEvent',
      duration: 10,
    });

    return {
      message: `Custom processing event emitted successfully!`,
      data,
    };
  }

  /**
   * Batch endpoint - will generate multiple events
   */
  @ApiOperation({ 
    summary: 'Process batch items',
    description: 'Process multiple items in batch, generating multiple processing events. Requires authentication.' 
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Batch processing completed successfully',
    type: ProcessingResultDto
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - missing or invalid bearer token',
    type: ErrorResponseDto
  })
  @SecureEndpoint()
  @Post('batch/:count')
  async processBatch(@Param('count') count: string) {
    const numItems = parseInt(count, 10) || 5;
    const results: any[] = [];

    for (let i = 0; i < numItems; i++) {
      // Simulate processing each item
      const item = {
        id: i + 1,
        processed: true,
        timestamp: new Date().toISOString(),
      };
      
      // Emit processing events
      this.eventEmitter.emitProcessingEvent({
        requestId: `batch-${Date.now()}-${i}`,
        action: 'complete',
        controller: 'DemoController',
        handler: 'processBatch',
        duration: Math.random() * 100,
      });

      results.push(item);
    }

    return {
      message: `Processed ${numItems} items - check processing events!`,
      results,
    };
  }

  /**
   * Error endpoint - will generate error events
   */
  @ApiOperation({ 
    summary: 'Trigger test error',
    description: 'Intentionally throws an error to demonstrate error event generation and exception filter handling.' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Test error thrown successfully',
    type: ErrorResponseDto
  })
  @SkipAuth()
  @Get('error')
  throwError() {
    throw new Error('This is a test error - check error events!');
  }

  /**
   * Validation endpoint - will generate validation events
   */
  @ApiOperation({ 
    summary: 'Validate user data',
    description: 'Validate user data and emit validation events (success or failure).' 
  })
  @ApiBody({
    type: UserDataDto,
    description: 'User data to validate',
    examples: {
      valid: {
        summary: 'Valid user data',
        value: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          age: 25
        }
      },
      invalid: {
        summary: 'Invalid user data (missing fields)',
        value: {
          age: -5
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Validation successful',
    type: ValidationResultDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Validation failed',
    type: ErrorResponseDto
  })
  @SkipAuth()
  @Post('validate')
  validateData(@Body() data: any) {
    // Simulate validation
    const errors: string[] = [];
    
    if (!data.name) errors.push('Name is required');
    if (!data.email) errors.push('Email is required');
    if (data.age && data.age < 0) errors.push('Age must be positive');

    if (errors.length > 0) {
      // Emit validation failure event
      this.eventEmitter.emitValidationEvent({
        requestId: `validate-${Date.now()}`,
        action: 'failure',
        target: 'body',
        validatorType: 'manual',
        errors,
      });

      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    // Emit validation success event
    this.eventEmitter.emitValidationEvent({
      requestId: `validate-${Date.now()}`,
      action: 'success',
      target: 'body',
      validatorType: 'manual',
    });

    return {
      message: 'Validation successful!',
      data,
    };
  }

  /**
   * Health check endpoint - system status
   */
  @ApiOperation({ 
    summary: 'Get system health status',
    description: 'Get current system health status including uptime and event metrics.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'System health status retrieved successfully',
    type: HealthStatusDto
  })
  @SkipAuth()
  @Get('health')
  getHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime() * 1000,
      eventsCount: 0, // Could be enhanced with actual event counting
    };
  }
}