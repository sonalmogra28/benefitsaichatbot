import { type NextRequest, NextResponse } from 'next/server';
import { protectAdminEndpoint } from '@/lib/middleware/auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logging/logger';
import { hybridLLMRouter } from '@/lib/ai/hybrid-llm-router';

// GET /api/admin/analytics/llm-routing - Get LLM routing statistics
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

    logger.info('API Request: GET /api/admin/analytics/llm-routing', {
      userId: user.id,
      companyId
    });

    const stats = hybridLLMRouter.getStats();
    
    // Calculate cost savings compared to using only GPT-4
    const totalQueries = stats.totalQueries;
    const gpt4CostPerQuery = 0.04; // Estimated cost per query for GPT-4
    const actualCostPerQuery = 0.015; // Estimated actual cost with hybrid routing
    const costSavings = totalQueries * (gpt4CostPerQuery - actualCostPerQuery);

    const duration = Date.now() - startTime;
    
    logger.apiResponse('GET', '/api/admin/analytics/llm-routing', 200, duration, {
      userId: user.id,
      companyId
    });

    return NextResponse.json({
      success: true,
      data: {
        routing: {
          totalQueries: stats.totalQueries,
          modelDistribution: stats.modelDistribution,
          costSavings: Math.max(0, costSavings),
          averageResponseTime: stats.averageResponseTime,
        },
        models: {
          'gpt-3.5-turbo': {
            costPer1M: 2.0,
            capabilities: ['simple_qa', 'basic_chat', 'faq'],
            usage: stats.modelDistribution.find(m => m.model === 'gpt-3.5-turbo')?.count || 0,
          },
          'gpt-4': {
            costPer1M: 40.0,
            capabilities: ['complex_reasoning', 'analysis', 'creative', 'technical'],
            usage: stats.modelDistribution.find(m => m.model === 'gpt-4')?.count || 0,
          },
          'gemini-1.5-flash': {
            costPer1M: 0.375,
            capabilities: ['simple_qa', 'basic_chat', 'faq', 'analysis'],
            usage: stats.modelDistribution.find(m => m.model === 'gemini-1.5-flash')?.count || 0,
          },
          'gemini-1.5-pro': {
            costPer1M: 6.25,
            capabilities: ['complex_reasoning', 'analysis', 'creative', 'technical'],
            usage: stats.modelDistribution.find(m => m.model === 'gemini-1.5-pro')?.count || 0,
          },
        },
        recommendations: {
          optimizeForCost: totalQueries > 1000 ? 'Consider increasing Gemini usage' : 'Current routing is optimal',
          optimizeForPerformance: stats.averageResponseTime > 2000 ? 'Consider adding more fast models' : 'Performance is good',
          costAnalysis: totalQueries > 0 ?
            `Estimated $${Math.round(costSavings * 100) / 100} cost savings vs GPT-4 only` :
            'Cost analysis pending',
        },
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('LLM routing analytics error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch LLM routing analytics' 
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/analytics/llm-routing - Reset routing statistics
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
    const { action } = body;

    logger.info('API Request: POST /api/admin/analytics/llm-routing', {
      userId: user.id,
      companyId,
      action
    });

    if (action === 'reset') {
      hybridLLMRouter.resetStats();
      
      const duration = Date.now() - startTime;
      
      logger.apiResponse('POST', '/api/admin/analytics/llm-routing', 200, duration, {
        userId: user.id,
        companyId,
        action
      });
      
      return NextResponse.json({ 
        success: true,
        message: 'Statistics reset successfully' 
      });
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Invalid action' 
      },
      { status: 400 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('LLM routing reset error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to reset statistics' 
      },
      { status: 500 }
    );
  }
}