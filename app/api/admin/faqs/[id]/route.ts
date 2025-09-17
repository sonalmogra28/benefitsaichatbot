import { NextResponse, type NextRequest } from 'next/server';
import { protectAdminEndpoint } from '@/lib/middleware/auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logging/logger';
import { faqService } from '@/lib/services/faq.service';
import { z } from 'zod';

const updateFaqSchema = z.object({
  question: z.string().min(1).optional(),
  answer: z.string().min(1).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/admin/faqs/[id] - Get specific FAQ
export async function GET(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { id: faqId } = await params;
  
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
    if (!companyId || !faqId) {
      logger.warn('Missing required parameters', { userId: user.id, companyId, faqId });
      return NextResponse.json(
        { success: false, error: 'Company ID or FAQ ID not found' },
        { status: 400 }
      );
    }

    logger.info('API Request: GET /api/admin/faqs/[id]', {
      userId: user.id,
      companyId,
      faqId
    });

    const faq = await faqService.getFAQById(faqId, companyId);
    
    if (!faq) {
      return NextResponse.json(
        { success: false, error: 'FAQ not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: faq
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('FAQ retrieval error', {
      path: request.nextUrl.pathname,
      method: request.method,
      faqId,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve FAQ' 
      },
      { status: 500 }
    );
  }
}

// PUT /api/admin/faqs/[id] - Update specific FAQ
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { id: faqId } = await params;
  
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
    if (!companyId || !faqId) {
      logger.warn('Missing required parameters', { userId: user.id, companyId, faqId });
      return NextResponse.json(
        { success: false, error: 'Company ID or FAQ ID not found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateFaqSchema.parse(body);

    logger.info('API Request: PUT /api/admin/faqs/[id]', {
      userId: user.id,
      companyId,
      faqId,
      updateFields: Object.keys(validatedData)
    });

    const updatedFAQ = await faqService.updateFAQ(faqId, companyId, validatedData);

    return NextResponse.json({
      success: true,
      data: updatedFAQ
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
    
    logger.error('FAQ update error', {
      path: request.nextUrl.pathname,
      method: request.method,
      faqId,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update FAQ' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/faqs/[id] - Delete specific FAQ
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { id: faqId } = await params;
  
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
    if (!companyId || !faqId) {
      logger.warn('Missing required parameters', { userId: user.id, companyId, faqId });
      return NextResponse.json(
        { success: false, error: 'Company ID or FAQ ID not found' },
        { status: 400 }
      );
    }

    logger.info('API Request: DELETE /api/admin/faqs/[id]', {
      userId: user.id,
      companyId,
      faqId
    });

    await faqService.deleteFAQ(faqId, companyId);

    return NextResponse.json({
      success: true,
      message: 'FAQ deleted successfully'
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('FAQ deletion error', {
      path: request.nextUrl.pathname,
      method: request.method,
      faqId,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete FAQ' 
      },
      { status: 500 }
    );
  }
}