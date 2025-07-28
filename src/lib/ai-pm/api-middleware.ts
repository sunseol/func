import { NextRequest, NextResponse } from 'next/server';
import { 
  createSupabaseClient, 
  checkAuth, 
  checkRateLimit, 
  getSecurityHeaders,
  cleanupRateLimitStore,
  AuthResult
} from './auth-middleware';
import { AIpmErrorType } from '@/types/ai-pm';

// API handler options
export interface ApiHandlerOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
    keyPrefix?: string;
  };
  validation?: {
    maxBodySize?: number;
    allowedMethods?: string[];
  };
}

// API handler context
export interface ApiContext {
  request: NextRequest;
  supabase: any;
  auth?: AuthResult;
  clientIP: string;
  userAgent: string;
}

// API handler function type
export type ApiHandler = (
  context: ApiContext,
  params?: any
) => Promise<NextResponse>;

// Cleanup rate limit store periodically
setInterval(cleanupRateLimitStore, 5 * 60 * 1000); // Every 5 minutes

// Main API middleware wrapper
export function withApiMiddleware(
  handler: ApiHandler,
  options: ApiHandlerOptions = {}
) {
  return async (request: NextRequest, params?: any) => {
    const startTime = Date.now();
    
    try {
      // Extract client information
      const clientIP = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      // Method validation
      if (options.validation?.allowedMethods) {
        if (!options.validation.allowedMethods.includes(request.method)) {
          return NextResponse.json(
            { 
              error: AIpmErrorType.VALIDATION_ERROR, 
              message: `${request.method} 메서드는 허용되지 않습니다.` 
            },
            { 
              status: 405,
              headers: {
                ...getSecurityHeaders(),
                'Allow': options.validation.allowedMethods.join(', ')
              }
            }
          );
        }
      }

      // Body size validation for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const contentLength = request.headers.get('content-length');
        const maxSize = options.validation?.maxBodySize || 1024 * 1024; // 1MB default
        
        if (contentLength && parseInt(contentLength) > maxSize) {
          return NextResponse.json(
            { 
              error: AIpmErrorType.VALIDATION_ERROR, 
              message: '요청 본문이 너무 큽니다.' 
            },
            { 
              status: 413,
              headers: getSecurityHeaders()
            }
          );
        }
      }

      // Create Supabase client
      const supabase = createSupabaseClient();
      
      // Authentication check
      let auth: AuthResult | undefined;
      if (options.requireAuth !== false) {
        auth = await checkAuth(supabase, options.requireAdmin);
        
        if ('error' in auth) {
          const status = auth.error === AIpmErrorType.UNAUTHORIZED ? 401 : 403;
          return NextResponse.json(auth, { 
            status,
            headers: getSecurityHeaders()
          });
        }
      }

      // Rate limiting
      if (options.rateLimit && auth && 'user' in auth) {
        const { maxRequests, windowMs, keyPrefix = 'api' } = options.rateLimit;
        const rateLimitKey = `${keyPrefix}-${request.method.toLowerCase()}-${auth.user.id}-${clientIP}`;
        const rateLimit = checkRateLimit(rateLimitKey, maxRequests, windowMs);
        
        if (!rateLimit.allowed) {
          return NextResponse.json(
            { 
              error: AIpmErrorType.VALIDATION_ERROR, 
              message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' 
            },
            { 
              status: 429,
              headers: {
                ...getSecurityHeaders(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
                'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
              }
            }
          );
        }
      }

      // Create context
      const context: ApiContext = {
        request,
        supabase,
        auth,
        clientIP,
        userAgent,
      };

      // Call the actual handler
      const response = await handler(context, params);

      // Add security headers and performance metrics
      const processingTime = Date.now() - startTime;
      const headers = new Headers(response.headers);
      
      // Add security headers
      Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
        headers.set(key, value);
      });

      // Add performance headers
      headers.set('X-Response-Time', `${processingTime}ms`);
      
      // Add rate limit headers if applicable
      if (options.rateLimit && auth && 'user' in auth) {
        const { maxRequests, windowMs, keyPrefix = 'api' } = options.rateLimit;
        const rateLimitKey = `${keyPrefix}-${request.method.toLowerCase()}-${auth.user.id}-${clientIP}`;
        const rateLimit = checkRateLimit(rateLimitKey, maxRequests, windowMs);
        
        headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
        headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
      }

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });

    } catch (error) {
      console.error('API middleware error:', error);
      
      return NextResponse.json(
        { 
          error: AIpmErrorType.INTERNAL_ERROR, 
          message: '서버 내부 오류가 발생했습니다.' 
        },
        { 
          status: 500,
          headers: getSecurityHeaders()
        }
      );
    }
  };
}

// Convenience wrapper for authenticated routes
export function withAuth(handler: ApiHandler, requireAdmin = false) {
  return withApiMiddleware(handler, {
    requireAuth: true,
    requireAdmin,
    rateLimit: {
      maxRequests: 100,
      windowMs: 60000, // 1 minute
    },
    validation: {
      maxBodySize: 1024 * 1024, // 1MB
    },
  });
}

// Convenience wrapper for admin-only routes
export function withAdminAuth(handler: ApiHandler) {
  return withAuth(handler, true);
}

// Convenience wrapper for public routes with rate limiting
export function withRateLimit(
  handler: ApiHandler, 
  maxRequests = 60, 
  windowMs = 60000
) {
  return withApiMiddleware(handler, {
    requireAuth: false,
    rateLimit: {
      maxRequests,
      windowMs,
      keyPrefix: 'public',
    },
  });
}

// Helper to extract and validate request body
export async function getValidatedBody<T>(
  request: NextRequest,
  validator?: (data: any) => { valid: boolean; errors: string[] }
): Promise<{ data?: T; errors?: string[] }> {
  try {
    const body = await request.json();
    
    if (validator) {
      const validation = validator(body);
      if (!validation.valid) {
        return { errors: validation.errors };
      }
    }
    
    return { data: body as T };
  } catch (error) {
    return { errors: ['유효하지 않은 JSON 형식입니다.'] };
  }
}

// Helper to create standardized error responses
export function createErrorResponse(
  error: AIpmErrorType,
  message: string,
  status: number = 400,
  details?: any
) {
  return NextResponse.json(
    { error, message, details },
    { 
      status,
      headers: getSecurityHeaders()
    }
  );
}

// Helper to create standardized success responses
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  message?: string
) {
  const response: any = { data };
  if (message) {
    response.message = message;
  }
  
  return NextResponse.json(response, {
    status,
    headers: getSecurityHeaders()
  });
}

// Request logging middleware
export function withLogging(handler: ApiHandler) {
  return async (context: ApiContext, params?: any) => {
    const { request, auth, clientIP } = context;
    const startTime = Date.now();
    
    // Log request
    console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`, {
      userId: auth && 'user' in auth ? auth.user.id : 'anonymous',
      clientIP,
      userAgent: context.userAgent,
    });
    
    try {
      const response = await handler(context, params);
      const duration = Date.now() - startTime;
      
      // Log response
      console.log(`[${new Date().toISOString()}] ${request.method} ${request.url} - ${response.status} (${duration}ms)`);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] ${request.method} ${request.url} - ERROR (${duration}ms)`, error);
      throw error;
    }
  };
}

// Combine multiple middleware
export function combineMiddleware(...middlewares: ((handler: ApiHandler) => ApiHandler)[]) {
  return (handler: ApiHandler) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}