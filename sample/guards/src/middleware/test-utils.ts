/**
 * Test utilities for Enhanced Security Headers Middleware testing
 */

import { Request, Response } from 'express';

export interface MockRequest extends Partial<Request> {
  method?: string;
  headers?: Record<string, string>;
  url?: string;
  path?: string;
}

export interface MockResponse extends Partial<Response> {
  header: jest.Mock;
  removeHeader: jest.Mock;
  status: jest.Mock;
  end: jest.Mock;
  setHeader?: jest.Mock;
}

/**
 * Create a mock Express Request object
 */
export function createMockRequest(overrides: MockRequest = {}): MockRequest {
  return {
    method: 'GET',
    headers: {},
    url: '/',
    path: '/',
    ...overrides,
  };
}

/**
 * Create a mock Express Response object with jest mocks
 */
export function createMockResponse(): MockResponse {
  const mockResponse: MockResponse = {
    header: jest.fn().mockReturnThis(),
    removeHeader: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };

  return mockResponse;
}

/**
 * Create a mock NextFunction
 */
export function createMockNext(): jest.Mock {
  return jest.fn();
}

/**
 * Test data generators
 */
export const TestOrigins = {
  allowed: [
    'http://localhost:3000',
    'http://localhost:4200',
    'https://app.example.com',
    'https://admin.example.com',
  ],
  disallowed: [
    'https://malicious.com',
    'https://evil.org',
    'http://suspicious.site',
    'javascript:alert(1)',
  ],
  edge: [
    '',
    'null',
    'undefined',
    'file://',
    'data:text/html,<script>alert(1)</script>',
  ]
};

export const TestMethods = [
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'
];

export const SecurityHeaders = {
  required: [
    'X-Content-Type-Options',
    'X-Frame-Options', 
    'X-XSS-Protection',
    'Referrer-Policy',
    'Content-Security-Policy',
  ],
  cors: [
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Methods',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Credentials',
    'Access-Control-Max-Age',
  ]
};

/**
 * Assert that required security headers are set
 */
export function assertSecurityHeaders(mockResponse: MockResponse, expectedHeaders: Record<string, string>) {
  Object.entries(expectedHeaders).forEach(([headerName, expectedValue]) => {
    expect(mockResponse.header).toHaveBeenCalledWith(headerName, expectedValue);
  });
}

/**
 * Assert that CORS headers are set correctly
 */
export function assertCorsHeaders(mockResponse: MockResponse, options: {
  origin?: string;
  methods?: string;
  headers?: string;
  credentials?: boolean;
  maxAge?: number;
}) {
  const { origin, methods, headers, credentials, maxAge } = options;

  if (origin) {
    expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', origin);
  }

  if (methods) {
    expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Methods', methods);
  }

  if (headers) {
    expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Headers', headers);
  }

  if (credentials !== undefined) {
    if (credentials) {
      expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
    } else {
      expect(mockResponse.header).not.toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
    }
  }

  if (maxAge !== undefined) {
    expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Max-Age', maxAge.toString());
  }
}

/**
 * Assert that security headers are not set (for negative testing)
 */
export function assertHeadersNotSet(mockResponse: MockResponse, headerNames: string[]) {
  headerNames.forEach(headerName => {
    expect(mockResponse.header).not.toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(headerName, 'i')),
      expect.anything()
    );
  });
}

/**
 * Test environment configuration mock
 */
export function createTestEnvironment(env: 'development' | 'staging' | 'production' | 'test') {
  const originalEnv = process.env.NODE_ENV;
  
  beforeEach(() => {
    process.env.NODE_ENV = env;
  });
  
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });
}

/**
 * Performance testing utility
 */
export function measureExecutionTime(fn: () => void): number {
  const start = process.hrtime.bigint();
  fn();
  const end = process.hrtime.bigint();
  return Number(end - start) / 1000000; // Convert to milliseconds
}

/**
 * Memory usage testing utility
 */
export function measureMemoryUsage(fn: () => void): { before: number; after: number; diff: number } {
  const before = process.memoryUsage().heapUsed;
  fn();
  const after = process.memoryUsage().heapUsed;
  
  return {
    before,
    after,
    diff: after - before,
  };
}

/**
 * Async test helper
 */
export function createAsyncTest(testFn: () => Promise<void>) {
  return async () => {
    try {
      await testFn();
    } catch (error) {
      throw error;
    }
  };
}

/**
 * Mock configuration generator
 */
export function createMockSecurityConfig(overrides: any = {}) {
  const defaultConfig = {
    cors: {
      origins: ['http://localhost:3000', 'http://localhost:4200'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400,
      optionsSuccessStatus: 204,
    },
    csp: {
      directives: "default-src 'self'; script-src 'self' 'unsafe-inline';"
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    }
  };

  return {
    ...defaultConfig,
    ...overrides,
    cors: { ...defaultConfig.cors, ...(overrides.cors || {}) },
    headers: { ...defaultConfig.headers, ...(overrides.headers || {}) },
  };
}