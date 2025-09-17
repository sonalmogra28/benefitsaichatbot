import { NextResponse, type NextRequest } from 'next/server';
import { protectAdminEndpoint } from '@/lib/middleware/auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logging/logger';
import { faqService } from '@/lib/services/faq.service';
import { z } from 'zod';

const createFaqSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().default(false),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

// GET /api/admin/faqs - List all FAQs for a company
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.admin(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate and authorize
    const { user, error } = await protectAdminEndpoint(request);
    if (error || !user) {
      return error!;
    }

    const companyId = user.companyId;
    if (!companyId) {
      logger.warn('Company ID not found for admin user', { userId: user.id });
      return NextResponse.json(
        { success: false, error: 'Company ID not found' },
        { status: 400 }
      );
    }

    logger.info('API Request: GET /api/admin/faqs', {
      userId: user.id,
      companyId
    });

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const isPublic = searchParams.get('isPublic') ? searchParams.get('isPublic') === 'true' : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined;

    const { faqs, total } = await faqService.getFAQsByCompany(companyId, {
      category,
      isPublic,
      limit,
      offset
    });

    return NextResponse.json({
      success: true,
      data: faqs,
      pagination: {
        total,
        limit: limit || 50,
        offset: offset || 0,
        hasMore: (offset || 0) + (limit || 50) < total
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('FAQ list error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve FAQs' 
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/faqs - Create new FAQ
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.admin(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate and authorize
    const { user, error } = await protectAdminEndpoint(request);
    if (error || !user) {
      return error!;
    }

    const companyId = user.companyId;
    if (!companyId) {
      logger.warn('Company ID not found for admin user', { userId: user.id });
      return NextResponse.json(
        { success: false, error: 'Company ID not found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = createFaqSchema.parse(body);

    logger.info('API Request: POST /api/admin/faqs', {
      userId: user.id,
      companyId,
      question: validatedData.question
    });

    const faq = await faqService.createFAQ({
      ...validatedData,
      companyId,
      createdBy: user.id
    });

    return NextResponse.json({
      success: true,
      data: faq
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid data format', 
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    logger.error('FAQ creation error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create FAQ' 
      },
      { status: 500 }
    );
  }
}