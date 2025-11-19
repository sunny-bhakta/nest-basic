/**
 * Dynamic CORS configuration that can be overridden by environment variables
 */
import { getCurrentConfig } from './cors.config';

/**
 * Enhanced CORS utility that combines config file with environment variables
 */
export class CorsManager {
  private static instance: CorsManager;
  
  private constructor() {}
  
  static getInstance(): CorsManager {
    if (!CorsManager.instance) {
      CorsManager.instance = new CorsManager();
    }
    return CorsManager.instance;
  }

  /**
   * Get origins from environment variable or config
   */
  getAllowedOrigins(): readonly string[] | boolean {
    const envOrigins = process.env.ALLOWED_ORIGINS;
    
    if (envOrigins) {
      // Parse comma-separated origins from environment
      return envOrigins.split(',').map(origin => origin.trim());
    }
    
    // Fallback to config file
    const config = getCurrentConfig();
    return config.cors.origins;
  }

  /**
   * Check if credentials should be included
   */
  shouldAllowCredentials(): boolean {
    const envCredentials = process.env.ENABLE_CORS_CREDENTIALS;
    
    if (envCredentials !== undefined) {
      return envCredentials === 'true';
    }
    
    return getCurrentConfig().cors.credentials;
  }

  /**
   * Get CORS max age
   */
  getMaxAge(): number {
    const envMaxAge = process.env.CORS_MAX_AGE;
    
    if (envMaxAge) {
      return parseInt(envMaxAge, 10);
    }
    
    return getCurrentConfig().cors.maxAge || 86400;
  }

  /**
   * Validate and get allowed origin for response
   */
  getAllowedOrigin(requestOrigin: string | undefined): string | null {
    if (!requestOrigin) return null;
    
    const allowedOrigins = this.getAllowedOrigins();
    
    // Allow all origins if true
    if (allowedOrigins === true) {
      return requestOrigin;
    }
    
    // Check if origin is in allowed list
    if (Array.isArray(allowedOrigins) && allowedOrigins.includes(requestOrigin)) {
      return requestOrigin;
    }
    
    // Development mode - be more permissive
    if (process.env.NODE_ENV === 'development') {
      // Allow localhost with any port
      if (requestOrigin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
        return requestOrigin;
      }
    }
    
    return null;
  }

  /**
   * Get dynamic CORS configuration
   */
  getCorsOptions() {
    const config = getCurrentConfig();
    
    return {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        const allowedOrigin = this.getAllowedOrigin(origin);
        
        if (allowedOrigin || !origin) {
          // Allow requests with no origin (like mobile apps or curl requests)
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: this.shouldAllowCredentials(),
      methods: config.cors.methods,
      allowedHeaders: config.cors.allowedHeaders,
      maxAge: this.getMaxAge(),
      preflightContinue: false,
      optionsSuccessStatus: 204,
    };
  }

  /**
   * Log CORS configuration for debugging
   */
  logConfiguration(): void {
    const origins = this.getAllowedOrigins();
    const credentials = this.shouldAllowCredentials();
    const maxAge = this.getMaxAge();
    
    console.log('🔒 CORS Configuration:');
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Allowed Origins: ${Array.isArray(origins) ? origins.join(', ') : origins}`);
    console.log(`   Credentials: ${credentials}`);
    console.log(`   Max Age: ${maxAge}s`);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️  Development mode: Additional localhost origins may be allowed');
    }
  }
}

// Export singleton instance
export const corsManager = CorsManager.getInstance();