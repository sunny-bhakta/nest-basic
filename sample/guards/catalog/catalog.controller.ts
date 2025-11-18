import { Controller, Get, Post, Body, Param, Delete, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { SecureEndpoint } from '../security/decorators/secure.decorator';
import { SkipAuth } from '../security/decorators/skip-auth.decorator';
import { AccessLevel } from '../enums/access-level.enum';
import { CatalogService } from './catalog.service';

@ApiTags('Catalog')
@Controller('catalog')
@ApiBearerAuth()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @SkipAuth()
  @ApiOperation({ summary: 'Get all catalog items (public)' })
  findAll() {
    return this.catalogService.findAll();
  }

  @Get('premium')
  @SecureEndpoint(AccessLevel.PREMIUM)
  @ApiOperation({ 
    summary: 'Get premium items (premium access required)',     
  })
  findPremiumItems(
    @Headers('authorization') authorization?: string,
  ) {
    console.log('Inside findPremiumItems method');
    console.log('Authorization header received:', authorization);
    
    if (!authorization) {
      console.log('No authorization header found!');
    } else {
      console.log('Authorization header exists:', authorization);
    }
    
    return this.catalogService.findPremiumItems();
  }

}