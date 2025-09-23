import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/admin-middleware';
import { USER_ROLES } from '@/lib/constants/roles';
import { getContainer } from '@/lib/azure/cosmos-db';
import { benefitService } from '@/lib/services/benefit-service';
import type { BenefitsSummary } from '@/types/api';

export const GET = withAuth(
  USER_ROLES.EMPLOYEE,
  async (request: NextRequest, context, user) => {
    try {
      // Get employee enrollments
      const enrollments = await benefitService.getEmployeeEnrollments(user.uid);
      
      // Get all benefit plans to map enrollments to plan details
      const allPlans = await benefitService.getBenefitPlans(user.companyId);
      const planMap = new Map(allPlans.map(plan => [plan.id, plan]));

      // Find health plan enrollment
      const healthEnrollment = enrollments.find(e => {
        const plan = planMap.get(e.planId);
        return plan?.type === 'health' || plan?.category === 'medical';
      });

      // Build health plan summary
      let healthPlan = undefined;
      if (healthEnrollment) {
        const plan = planMap.get(healthEnrollment.planId);
        if (plan) {
          healthPlan = {
            name: plan.name,
            type: plan.type || 'health',
            deductibleUsed: 0, // This would come from claims data
            deductibleTotal: healthEnrollment.coverageType === 'family' 
              ? plan.deductibleFamily || plan.deductible || 0
              : plan.deductibleIndividual || plan.deductible || 0,
            outOfPocketUsed: 0, // This would come from claims data
            outOfPocketMax: healthEnrollment.coverageType === 'family'
              ? plan.outOfPocketMaxFamily || plan.outOfPocketMax || 0
              : plan.outOfPocketMaxIndividual || plan.outOfPocketMax || 0,
            premiumPaid: 0, // This would come from payment history
            premiumTotal: plan.monthlyCost * 12,
          };
        }
      }

      // Build coverage types with actual plan data
      const coverageTypes = enrollments.map((enrollment) => {
        const plan = planMap.get(enrollment.planId);
        return {
          type: plan?.type || plan?.category || 'unknown',
          status: enrollment.status as 'active' | 'not-enrolled',
          monthlyPremium: plan?.monthlyCost || enrollment.monthlyCost || 0,
          coverageLevel: enrollment.coverageType,
        };
      });

      // Calculate upcoming deadlines
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const upcomingDeadlines = [];

      // Open enrollment (typically November)
      const openEnrollmentDate = new Date(currentYear, 10, 15); // November 15th
      if (openEnrollmentDate > currentDate) {
        const daysRemaining = Math.ceil((openEnrollmentDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        upcomingDeadlines.push({
          event: 'Open Enrollment',
          date: openEnrollmentDate.toISOString().split('T')[0],
          daysRemaining,
        });
      }

      // Calculate savings opportunity
      const healthPlans = allPlans.filter(plan => plan.type === 'health' || plan.category === 'medical');
      let savingsOpportunity = undefined;
      
      if (healthPlans.length > 1 && healthEnrollment) {
        const currentPlan = planMap.get(healthEnrollment.planId);
        const otherPlans = healthPlans.filter(plan => plan.id !== healthEnrollment.planId);
        
        if (currentPlan && otherPlans.length > 0) {
          const cheapestPlan = otherPlans.reduce((cheapest, plan) => 
            plan.monthlyCost < cheapest.monthlyCost ? plan : cheapest
          );
          
          const potentialSavings = (currentPlan.monthlyCost - cheapestPlan.monthlyCost) * 12;
          
          if (potentialSavings > 0) {
            savingsOpportunity = {
              amount: potentialSavings,
              recommendation: `Consider switching to ${cheapestPlan.name} to save $${potentialSavings} annually.`,
            };
          }
        }
      }

      const summary: BenefitsSummary = {
        healthPlan,
        coverageTypes,
        upcomingDeadlines,
        savingsOpportunity,
      };

      return NextResponse.json(summary);
    } catch (error) {
      console.error('Error fetching benefits summary:', error);
      return NextResponse.json(
        { error: 'Failed to fetch benefits summary' },
        { status: 500 },
      );
    }
  },
);
