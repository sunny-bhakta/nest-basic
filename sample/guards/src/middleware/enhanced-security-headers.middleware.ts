import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { getCurrentConfig } from '../config/cors.config';
import { corsManager } from '../config/cors.manager';

/**
 * Alternative security headers middleware using CorsManager
 * This version provides more flexibility with environment variable overrides
 */
@Injectable()
export class EnhancedSecurityHeadersMiddleware implements NestMiddleware {
  constructor() {
    // Log CORS configuration on startup
    corsManager.logConfiguration();
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const config = getCurrentConfig();
    const requestOrigin = req.headers.origin;

    // CORS Headers using CorsManager
    const allowedOrigin = corsManager.getAllowedOrigin(requestOrigin);
    if (allowedOrigin) {
      res.header('Access-Control-Allow-Origin', allowedOrigin);
      
      if (corsManager.shouldAllowCredentials()) {
        res.header('Access-Control-Allow-Credentials', 'true');
      }
    }

    // Set allowed methods and headers from config
    res.header('Access-Control-Allow-Methods', config.cors.methods.join(','));
    res.header('Access-Control-Allow-Headers', config.cors.allowedHeaders.join(', '));

    // Apply security headers from configuration
    Object.entries(config.headers).forEach(([key, value]) => {
      res.header(key, value);
    });
    
    // Content Security Policy from config
    res.header('Content-Security-Policy', config.csp.directives);
    
    // Remove server information
    res.removeHeader('X-Powered-By');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Max-Age', corsManager.getMaxAge().toString());
      res.status(204).end();
      return;
    }

    next();
  }
}