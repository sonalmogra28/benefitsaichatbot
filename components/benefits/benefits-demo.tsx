'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Users, MapPin, CheckCircle, XCircle, DollarSign } from 'lucide-react';

interface BenefitPlan {
  id: string;
  name: string;
  type: string;
  provider: string;
  monthlyPremium: number;
  biweeklyPremium: number;
  deductible: number;
  features: string[];
  limitations: string[];
  regionalAvailability: string[];
}

interface EligibilityResult {
  planId: string;
  planName: string;
  provider: string;
  eligible: boolean;
  reason?: string;
  requirements?: {
    employeeType: string;
    hoursRequired?: number;
    waitingPeriod: string;
    regionalAvailability: string[];
  };
}

interface PremiumCalculation {
  planId: string;
  tier: string;
  monthlyAmount: number;
  biweeklyAmount: number;
  annualAmount: number;
  employeeContribution: number;
  employerContribution: number;
}

export function BenefitsDemo() {
  const [plans, setPlans] = useState<BenefitPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search filters
  const [region, setRegion] = useState('California');
  const [planType, setPlanType] = useState('medical');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Eligibility check
  const [eligibilityData, setEligibilityData] = useState({
    planId: '',
    employeeType: 'full-time' as 'full-time' | 'part-time',
    hoursWorked: 40,
    region: 'California'
  });
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  
  // Premium calculation
  const [premiumData, setPremiumData] = useState({
    planId: '',
    tier: 'employeeOnly' as 'employeeOnly' | 'employeeSpouse' | 'employeeChildren' | 'employeeFamily',
    payFrequency: 'monthly' as 'monthly' | 'biweekly'
  });
  const [premiumResult, setPremiumResult] = useState<PremiumCalculation | null>(null);

  // Load plans on component mount
  useEffect(() => {
    loadPlans();
  }, [region, planType]);

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        region,
        planType,
        ...(searchTerm && { search: searchTerm })
      });
      
      const response = await fetch(`/api/benefits?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setPlans(data.data);
      } else {
        setError(data.error || 'Failed to load plans');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = async () => {
    if (!eligibilityData.planId) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/benefits/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eligibilityData)
      });
      
      const data = await response.json();
      if (data.success) {
        setEligibilityResult(data.data);
      } else {
        setError(data.error || 'Eligibility check failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculatePremium = async () => {
    if (!premiumData.planId) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/benefits/calculate-premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(premiumData)
      });
      
      const data = await response.json();
      if (data.success) {
        setPremiumResult(data.data);
      } else {
        setError(data.error || 'Premium calculation failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const comparePlans = async (planIds: string[]) => {
    setLoading(true);
    try {
      const response = await fetch('/api/benefits/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planIds, region })
      });
      
      const data = await response.json();
      if (data.success) {
        // Handle comparison results
        logger.info('Comparison results:', data.data);
      } else {
        setError(data.error || 'Plan comparison failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">AmeriVet Benefits Assistant</h1>
        <p className="text-muted-foreground">
          Explore your 2024-2025 benefits options with AI-powered assistance
        </p>
      </div>

      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="plans">Browse Plans</TabsTrigger>
          <TabsTrigger value="eligibility">Check Eligibility</TabsTrigger>
          <TabsTrigger value="premium">Calculate Premium</TabsTrigger>
          <TabsTrigger value="compare">Compare Plans</TabsTrigger>
        </TabsList>

        {/* Browse Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          <div className="flex gap-4 items-center">
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="California">California</SelectItem>
                <SelectItem value="Oregon">Oregon</SelectItem>
                <SelectItem value="Washington">Washington</SelectItem>
                <SelectItem value="nationwide">Nationwide</SelectItem>
              </SelectContent>
            </Select>

            <Select value={planType} onValueChange={setPlanType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Plan Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="dental">Dental</SelectItem>
                <SelectItem value="vision">Vision</SelectItem>
                <SelectItem value="voluntary">Voluntary</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search plans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />

            <Button onClick={loadPlans} disabled={loading}>
              {loading ? 'Loading...' : 'Search'}
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription>{plan.provider}</CardDescription>
                    </div>
                    <Badge variant="secondary">{plan.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-semibold">
                      ${plan.monthlyPremium.toFixed(2)}/month
                    </span>
                  </div>
                  
                  {plan.deductible > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Deductible: ${plan.deductible.toLocaleString()}
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-sm font-medium">Features:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {plan.features.slice(0, 3).map((feature, idx) => (
                        <li key={idx}>• {feature}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setEligibilityData(prev => ({ ...prev, planId: plan.id }))}
                    >
                      Check Eligibility
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => setPremiumData(prev => ({ ...prev, planId: plan.id }))}
                    >
                      Calculate Premium
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Eligibility Check Tab */}
        <TabsContent value="eligibility" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Eligibility Checker
              </CardTitle>
              <CardDescription>
                Check if you&apos;re eligible for specific benefit plans
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Plan</label>
                  <Select 
                    value={eligibilityData.planId} 
                    onValueChange={(value) => setEligibilityData(prev => ({ ...prev, planId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - {plan.provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Employee Type</label>
                  <Select 
                    value={eligibilityData.employeeType} 
                    onValueChange={(value: 'full-time' | 'part-time') => 
                      setEligibilityData(prev => ({ ...prev, employeeType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Hours Worked per Week</label>
                  <Input
                    type="number"
                    value={eligibilityData.hoursWorked}
                    onChange={(e) => setEligibilityData(prev => ({ 
                      ...prev, 
                      hoursWorked: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Region</label>
                  <Select 
                    value={eligibilityData.region} 
                    onValueChange={(value) => setEligibilityData(prev => ({ ...prev, region: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="California">California</SelectItem>
                      <SelectItem value="Oregon">Oregon</SelectItem>
                      <SelectItem value="Washington">Washington</SelectItem>
                      <SelectItem value="nationwide">Nationwide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={checkEligibility} disabled={loading || !eligibilityData.planId}>
                {loading ? 'Checking...' : 'Check Eligibility'}
              </Button>

              {eligibilityResult && (
                <div className={`p-4 rounded-md border ${
                  eligibilityResult.eligible 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {eligibilityResult.eligible ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-semibold">
                      {eligibilityResult.eligible ? 'Eligible' : 'Not Eligible'}
                    </span>
                  </div>
                  
                  <p className="text-sm">
                    <strong>{eligibilityResult.planName}</strong> - {eligibilityResult.provider}
                  </p>
                  
                  {eligibilityResult.reason && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {eligibilityResult.reason}
                    </p>
                  )}

                  {eligibilityResult.requirements && (
                    <div className="mt-3 text-sm">
                      <p className="font-medium">Requirements:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Employee Type: {eligibilityResult.requirements.employeeType}</li>
                        {eligibilityResult.requirements.hoursRequired && (
                          <li>Hours Required: {eligibilityResult.requirements.hoursRequired}+</li>
                        )}
                        <li>Waiting Period: {eligibilityResult.requirements.waitingPeriod}</li>
                        <li>Available in: {eligibilityResult.requirements.regionalAvailability.join(', ')}</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Premium Calculation Tab */}
        <TabsContent value="premium" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Premium Calculator
              </CardTitle>
              <CardDescription>
                Calculate your monthly and annual premium costs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Plan</label>
                  <Select 
                    value={premiumData.planId} 
                    onValueChange={(value) => setPremiumData(prev => ({ ...prev, planId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - {plan.provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Coverage Tier</label>
                  <Select 
                    value={premiumData.tier} 
                    onValueChange={(value: 'employeeOnly' | 'employeeSpouse' | 'employeeChildren' | 'employeeFamily') => 
                      setPremiumData(prev => ({ ...prev, tier: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employeeOnly">Employee Only</SelectItem>
                      <SelectItem value="employeeSpouse">Employee + Spouse</SelectItem>
                      <SelectItem value="employeeChildren">Employee + Children</SelectItem>
                      <SelectItem value="employeeFamily">Employee + Family</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Pay Frequency</label>
                  <Select 
                    value={premiumData.payFrequency} 
                    onValueChange={(value: 'monthly' | 'biweekly') => 
                      setPremiumData(prev => ({ ...prev, payFrequency: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={calculatePremium} disabled={loading || !premiumData.planId}>
                {loading ? 'Calculating...' : 'Calculate Premium'}
              </Button>

              {premiumResult && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h3 className="font-semibold mb-3">Premium Calculation Results</h3>
                  
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Premium</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${premiumResult.monthlyAmount.toFixed(2)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Bi-weekly Premium</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${premiumResult.biweeklyAmount.toFixed(2)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Annual Premium</p>
                      <p className="text-xl font-semibold">
                        ${premiumResult.annualAmount.toFixed(2)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Employee Contribution</p>
                      <p className="text-lg">
                        ${premiumResult.employeeContribution.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {premiumResult.employerContribution > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">Employer Contribution</p>
                      <p className="text-lg font-semibold text-blue-600">
                        ${premiumResult.employerContribution.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plan Comparison Tab */}
        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Plan Comparison
              </CardTitle>
              <CardDescription>
                Compare up to 5 benefit plans side by side
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Select plans from the &quot;Browse Plans&quot; tab to compare them here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
