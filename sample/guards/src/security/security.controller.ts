import { Controller, Post, Body, Headers, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SecurityService } from './security.service';
import { SkipAuth } from './decorators/skip-auth.decorator';

@ApiTags('Security')
@Controller('auth')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) { }

  @Post('login')
  @SkipAuth()
  @ApiOperation({ summary: 'Login to get bearer token' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiOperation({
    summary: 'Login to get bearer token',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              username: { type: 'string', example: 'premium' },
              password: { type: 'string', example: 'premium123' },
            },
            required: ['username', 'password'],
          },
        },
      },
    },
  })
  async login(@Body() credentials: any) {
    const validatedUser = await this.securityService.validateCredentials(
      credentials.username,
      credentials.password,
    );

    const token = await this.securityService.generateToken(validatedUser);

    return {
      access_token: token,
      user: {
        username: validatedUser.username,
        accessLevel: validatedUser.accessLevel,
      },
    };
  }
}