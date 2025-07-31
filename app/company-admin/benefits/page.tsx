import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { benefitPlans } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function BenefitsPage() {
  const session = await auth();
  
  if (!session?.user?.companyId) {
    redirect('/login');
  }
  
  const plans = await db
    .select()
    .from(benefitPlans)
    .where(eq(benefitPlans.companyId, session.user.companyId))
    .orderBy(benefitPlans.type, benefitPlans.name);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Benefit Plans</h1>
          <p className="text-muted-foreground">Manage your company&apos;s benefit offerings</p>
        </div>
        <Button asChild>
          <a href="/company-admin/benefits/new">Create Plan</a>
        </Button>
      </div>
      
      <div className="grid gap-4">
        {['health', 'dental', 'vision', 'other'].map((type) => {
          const typePlans = plans.filter(p => p.type === type);
          if (typePlans.length === 0) return null;
          
          return (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="capitalize">{type} Plans</CardTitle>
                <CardDescription>
                  {type === 'health' && 'Medical insurance plans'}
                  {type === 'dental' && 'Dental coverage plans'}
                  {type === 'vision' && 'Vision care plans'}
                  {type === 'other' && 'Additional benefit plans'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Monthly Premium (Employee)</TableHead>
                      <TableHead>Monthly Premium (Family)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typePlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{plan.description}</TableCell>
                        <TableCell>{plan.monthlyPremiumEmployee ? formatCurrency(Number(plan.monthlyPremiumEmployee)) : 'N/A'}/mo</TableCell>
                        <TableCell>{plan.monthlyPremiumFamily ? formatCurrency(Number(plan.monthlyPremiumFamily)) : 'N/A'}/mo</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            plan.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {plan.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`/company-admin/benefits/${plan.id}`}>Edit</a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
        
        {plans.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No benefit plans found. Create your first plan to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}