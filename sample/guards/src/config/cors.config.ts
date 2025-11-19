/**
 * CORS Configuration for different environments
 * Provides centralized configuration for Cross-Origin Resource Sharing
 */

export interface CorsConfig {
  origins: readonly string[] | boolean;
  methods: readonly string[];
  allowedHeaders: readonly string[];
  credentials: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

export interface SecurityConfig {
  cors: CorsConfig;
  csp: {
    directives: string;
  };
  headers: {
    [key: string]: string;
  };
}

/**
 * Environment-specific CORS configurations
 */
export const corsConfigs = {
  development: {
    origins: [
      'http://localhost:3000',
      'http://localhost:4200',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4200',
      'http://127.0.0.1:8080',
      // Add more development origins as needed
    ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With', 
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Request-ID',
      'Cache-Control'
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200,
  },

  staging: {
    origins: [
      'https://staging.yourdomain.com',
      'https://staging-app.yourdomain.com',
      'https://preview.yourdomain.com',
    ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type', 
      'Accept',
      'Authorization',
      'X-API-Key'
    ],
    credentials: true,
    maxAge: 3600, // 1 hour
  },

  production: {
    origins: [
      'https://yourdomain.com',
      'https://app.yourdomain.com',
      'https://admin.yourdomain.com',
      // Add your production domains
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], // No OPTIONS needed explicitly
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With'
    ],
    credentials: true,
    maxAge: 7200, // 2 hours
  },

  test: {
    origins: true, // Allow all origins in test environment
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['*'],
    credentials: false,
    maxAge: 0,
  }
} as const;

/**
 * Security headers configuration by environment
 */
export const securityConfigs: Record<string, SecurityConfig> = {
  development: {
    cors: corsConfigs.development,
    csp: {
      directives: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // More permissive for dev
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data: https:",
        "connect-src 'self' ws: wss: https:",
        "media-src 'self'",
        "object-src 'none'",
        "base-uri 'self'"
      ].join('; ')
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN', // More permissive for dev tools
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    }
  },

  production: {
    cors: corsConfigs.production,
    csp: {
      directives: [
        "default-src 'self'",
        "script-src 'self'", // Strict - no unsafe-inline
        "style-src 'self'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self' https:",
        "media-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'"
      ].join('; ')
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    }
  },

  staging: {
    cors: corsConfigs.staging,
    csp: {
      directives: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'", // Slightly more permissive than prod
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https:",
        "media-src 'self'",
        "object-src 'none'",
        "base-uri 'self'"
      ].join('; ')
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    }
  }
};

/**
 * Get configuration for current environment
 */
export function getCurrentConfig(): SecurityConfig {
  const env = process.env.NODE_ENV || 'development';
  return securityConfigs[env] || securityConfigs.development;
}

/**
 * Get CORS configuration for current environment
 */
export function getCorsConfig(): CorsConfig {
  return getCurrentConfig().cors;
}

/**
 * Check if origin is allowed for current environment
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  
  const config = getCorsConfig();
  
  // If origins is true, allow all
  if (config.origins === true) return true;
  
  // If origins is array, check if origin is in the list
  if (Array.isArray(config.origins)) {
    return config.origins.includes(origin);
  }
  
  return false;
}

/**
 * Get allowed origins as string for Access-Control-Allow-Origin header
 */
export function getAllowedOrigin(requestOrigin: string | undefined): string {
  if (!requestOrigin) return 'null';
  
  const config = getCorsConfig();
  
  // In development, be more permissive
  if (process.env.NODE_ENV === 'development') {
    return requestOrigin;
  }
  
  // Check if origin is allowed
  if (isOriginAllowed(requestOrigin)) {
    return requestOrigin;
  }
  
  return 'null';
}