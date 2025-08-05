import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { getChatAnalytics, getTopQuestions, getCostBreakdown } from '@/lib/services/analytics.service';
import { subDays } from 'date-fns';
import AnalyticsDashboard from '@/components/admin/analytics-dashboard';

export default async function AnalyticsPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/sign-in');
  }

  // Check if user has admin permissions
  if (session.user.type !== 'platform_admin' && 
      session.user.type !== 'company_admin' && 
      session.user.type !== 'hr_admin') {
    redirect('/dashboard');
  }

  const companyId = session.user.companyId;
  if (!companyId) {
    redirect('/dashboard');
  }

  // Get analytics data for the last 30 days
  const endDate = new Date();
  const startDate = subDays(endDate, 30);
  
  const [analytics, topQuestions, costBreakdown] = await Promise.all([
    getChatAnalytics(companyId, { startDate, endDate }),
    getTopQuestions(companyId, 10, { startDate, endDate }),
    getCostBreakdown(companyId, { startDate, endDate }),
  ]);

  return <AnalyticsDashboard analytics={analytics} topQuestions={topQuestions} costBreakdown={costBreakdown} />;
}