#!/usr/bin/env tsx
// Seed Database with Sample Benefits Data

import { db } from '../lib/firebase/admin';
import { ragSystem } from '../lib/ai/rag-system';
import { FieldValue } from 'firebase-admin/firestore';

const SAMPLE_BENEFITS_DOCUMENTS = [
  {
    title: '2024 Employee Health Benefits Guide',
    type: 'health_benefits',
    content: `
# 2024 Employee Health Benefits Guide

## Medical Plans Overview

### PPO Plan (Preferred Provider Organization)
- **Monthly Premium**: $200 (Employee Only), $400 (Employee + Spouse), $350 (Employee + Children), $600 (Family)
- **Annual Deductible**: $1,500 Individual / $3,000 Family
- **Out-of-Pocket Maximum**: $4,000 Individual / $8,000 Family
- **Coinsurance**: 80/20 after deductible (in-network)
- **Primary Care Copay**: $30
- **Specialist Copay**: $50
- **Emergency Room**: $250 copay + 20% coinsurance
- **Prescription Coverage**: 
  - Generic: $10 copay
  - Preferred Brand: $35 copay
  - Non-Preferred Brand: $60 copay
  - Specialty: 30% coinsurance (max $250)

### HDHP Plan (High Deductible Health Plan with HSA)
- **Monthly Premium**: $100 (Employee Only), $200 (Employee + Spouse), $175 (Employee + Children), $300 (Family)
- **Annual Deductible**: $3,000 Individual / $6,000 Family
- **Out-of-Pocket Maximum**: $5,000 Individual / $10,000 Family
- **Coinsurance**: 90/10 after deductible (in-network)
- **HSA Contribution Limits**: $4,150 Individual / $8,300 Family
- **Employer HSA Contribution**: $1,000 Individual / $2,000 Family annually
- **Preventive Care**: 100% covered (no deductible)
- **Prescription Coverage**: Subject to deductible, then 10% coinsurance

### HMO Plan (Health Maintenance Organization)
- **Monthly Premium**: $150 (Employee Only), $300 (Employee + Spouse), $275 (Employee + Children), $500 (Family)
- **Annual Deductible**: $500 Individual / $1,000 Family
- **Out-of-Pocket Maximum**: $3,000 Individual / $6,000 Family
- **Primary Care Copay**: $20
- **Specialist Copay**: $40 (referral required)
- **Emergency Room**: $150 copay
- **Prescription Coverage**:
  - Generic: $5 copay
  - Preferred Brand: $25 copay
  - Non-Preferred Brand: $45 copay

## Enrollment Information
- **New Hire Enrollment**: Within 30 days of start date
- **Annual Open Enrollment**: November 1-30
- **Qualifying Life Events**: Marriage, divorce, birth/adoption, loss of coverage
- **Documentation Required**: Social Security numbers for all covered dependents

## Preventive Care Coverage
All plans cover preventive care at 100% with no deductible:
- Annual physical exams
- Well-child visits
- Immunizations
- Cancer screenings (mammograms, colonoscopies)
- Routine lab work
- Preventive medications
    `,
  },
  {
    title: 'Dental and Vision Benefits',
    type: 'dental_vision',
    content: `
# Dental and Vision Benefits Guide

## Dental Plans

### Premier Dental PPO
- **Monthly Premium**: $40 (Employee), $80 (Employee + Spouse), $70 (Employee + Children), $120 (Family)
- **Annual Maximum Benefit**: $2,500 per person
- **Deductible**: $50 Individual / $150 Family
- **Coverage**:
  - Preventive (cleanings, x-rays): 100% covered
  - Basic (fillings, extractions): 80% covered after deductible
  - Major (crowns, bridges): 60% covered after deductible
  - Orthodontia: 50% covered, $2,000 lifetime maximum

### Basic Dental HMO
- **Monthly Premium**: $20 (Employee), $40 (Employee + Spouse), $35 (Employee + Children), $60 (Family)
- **No Annual Maximum**
- **No Deductible**
- **Fixed Copays**:
  - Preventive care: $0
  - Fillings: $20-40
  - Crowns: $250
  - Root canals: $200
  - Must use in-network dentists

## Vision Plans

### Vision Care Plan
- **Monthly Premium**: $10 (Employee), $20 (Employee + Spouse), $18 (Employee + Children), $30 (Family)
- **Coverage (In-Network)**:
  - Eye Exam: $10 copay (once per year)
  - Frames: $150 allowance (once every 2 years)
  - Lenses: $25 copay (once per year)
  - Contact Lenses: $150 allowance instead of glasses
- **Discounts**:
  - 20% off additional pairs of glasses
  - 15% off LASIK surgery

## Flexible Spending Accounts (FSA)

### Health Care FSA
- **Annual Contribution Limit**: $3,200
- **Use For**: Medical, dental, vision expenses not covered by insurance
- **"Use It or Lose It"**: $640 carryover allowed
- **Eligible Expenses**: Copays, deductibles, prescriptions, medical supplies

### Dependent Care FSA
- **Annual Contribution Limit**: $5,000 ($2,500 if married filing separately)
- **Use For**: Childcare, after-school programs, day camps, elder care
- **Age Limits**: Children under 13 or disabled dependents
- **Important**: Cannot be used with dependent care tax credit
    `,
  },
  {
    title: 'Life and Disability Insurance',
    type: 'life_disability',
    content: `
# Life and Disability Insurance Benefits

## Life Insurance

### Basic Life Insurance (Employer-Paid)
- **Coverage Amount**: 1x annual salary (rounded to nearest $1,000)
- **Maximum Coverage**: $500,000
- **Cost**: Free to all full-time employees
- **Beneficiary Designation**: Required upon enrollment

### Supplemental Life Insurance (Employee-Paid)
- **Coverage Options**: 1x, 2x, 3x, 4x, or 5x annual salary
- **Maximum Coverage**: $1,000,000
- **Guaranteed Issue**: Up to 2x salary without medical exam (new hires only)
- **Evidence of Insurability**: Required for amounts over guaranteed issue
- **Cost**: Age-based rates per $1,000 of coverage

### Dependent Life Insurance
- **Spouse Coverage**: $10,000, $25,000, or $50,000
- **Child Coverage**: $5,000 or $10,000 per child
- **Eligibility**: Children from birth to age 26
- **Cost**: Flat monthly rate regardless of number of children

## Disability Insurance

### Short-Term Disability (STD)
- **Waiting Period**: 7 calendar days
- **Benefit Amount**: 60% of weekly salary
- **Maximum Weekly Benefit**: $2,500
- **Duration**: Up to 26 weeks
- **Cost**: Employer-paid
- **Coordination**: Integrates with state disability where applicable

### Long-Term Disability (LTD)
- **Waiting Period**: 180 days (after STD exhausted)
- **Benefit Amount**: 60% of monthly salary
- **Maximum Monthly Benefit**: $10,000
- **Duration**: To Social Security retirement age
- **Cost**: Employee-paid (pre-tax or post-tax options)
- **Features**:
  - Own occupation coverage for 24 months
  - Mental health/substance abuse limited to 24 months
  - Cost of living adjustments available

## Accidental Death & Dismemberment (AD&D)
- **Coverage Amount**: Matches basic life insurance amount
- **Additional Coverage**: Can purchase up to 5x salary
- **Benefits**:
  - 100% for accidental death
  - 50-100% for dismemberment depending on loss
  - Additional benefits for paralysis, coma, severe burns

## Important Information
- **Pre-existing Conditions**: May apply to disability coverage
- **Portability**: Available for life insurance upon termination
- **Conversion**: Term life can be converted to whole life
- **Tax Implications**: Employer-paid premiums over $50,000 are taxable
    `,
  },
  {
    title: 'Retirement and Savings Plans',
    type: 'retirement',
    content: `
# Retirement and Savings Plans

## 401(k) Retirement Plan

### Plan Features
- **Eligibility**: All employees 21+ after 90 days of service
- **Enrollment**: Automatic enrollment at 3% (can opt out)
- **Auto Escalation**: 1% annual increase up to 10%

### Contribution Limits (2024)
- **Employee Contribution Limit**: $23,000
- **Catch-Up Contribution (50+)**: Additional $7,500
- **Combined Employee + Employer Limit**: $69,000

### Employer Matching
- **Match Formula**: 100% of first 3%, 50% of next 2%
- **Maximum Match**: 4% of eligible compensation
- **Vesting Schedule**:
  - Employee contributions: Always 100% vested
  - Employer match: 3-year graded vesting
    - Year 1: 33% vested
    - Year 2: 66% vested
    - Year 3: 100% vested

### Investment Options
- **Target Date Funds**: Age-appropriate asset allocation
- **Index Funds**: S&P 500, Total Market, International
- **Bond Funds**: Government, Corporate, High Yield
- **Company Stock**: Limited to 10% of portfolio
- **Stable Value Fund**: Capital preservation option
- **Self-Directed Brokerage**: Available for experienced investors

### Roth 401(k) Option
- **After-Tax Contributions**: No immediate tax deduction
- **Tax-Free Withdrawals**: In retirement (after 59½ and 5 years)
- **No Income Limits**: Unlike Roth IRA
- **Employer Match**: Goes to traditional 401(k)

## Health Savings Account (HSA)

### Triple Tax Advantage
1. Tax-deductible contributions
2. Tax-free growth
3. Tax-free withdrawals for medical expenses

### Contribution Limits (2024)
- **Individual**: $4,150
- **Family**: $8,300
- **Catch-Up (55+)**: Additional $1,000
- **Employer Contribution**: $1,000 individual / $2,000 family

### Investment Options
- **Cash Account**: FDIC insured up to $250,000
- **Investment Threshold**: Can invest after $1,000 balance
- **Investment Options**: Mutual funds similar to 401(k)

### Qualified Expenses
- Medical, dental, vision expenses
- Prescription medications
- Medical equipment and supplies
- COBRA premiums
- Long-term care insurance premiums
- Medicare premiums (after 65)

## Financial Wellness Resources

### Planning Tools
- **Retirement Calculator**: Project retirement readiness
- **Investment Advice**: Free consultations with advisors
- **Financial Education**: Quarterly webinars and workshops

### Loans and Withdrawals
- **401(k) Loans**: Up to 50% of vested balance or $50,000
- **Hardship Withdrawals**: For immediate financial needs
- **In-Service Withdrawals**: Available after age 59½
    `,
  },
  {
    title: 'Employee Assistance and Wellness Programs',
    type: 'wellness',
    content: `
# Employee Assistance and Wellness Programs

## Employee Assistance Program (EAP)

### Mental Health Support
- **Free Counseling Sessions**: 8 sessions per year per issue
- **24/7 Crisis Hotline**: 1-800-EAP-HELP
- **Topics Covered**:
  - Stress and anxiety management
  - Depression and mood disorders
  - Relationship and family issues
  - Grief and loss
  - Substance abuse
  - Work-life balance

### Work-Life Services
- **Legal Consultations**: 30-minute free consultations
- **Financial Counseling**: Budgeting, debt management, retirement planning
- **Identity Theft Recovery**: Full restoration services
- **Child Care Resources**: Referrals and backup care options
- **Elder Care Support**: Resources for aging parents

## Wellness Programs

### Preventive Health Initiatives
- **Annual Biometric Screening**: Free on-site or at-home kits
- **Health Risk Assessment**: Online questionnaire with personalized report
- **Flu Shots**: Free on-site during fall season
- **Wellness Challenges**: Quarterly team and individual competitions

### Fitness Benefits
- **Gym Membership Reimbursement**: Up to $50/month
- **Virtual Fitness Classes**: Live and on-demand options
- **On-Site Fitness Center**: 24/7 access with key card
- **Fitness Tracker Subsidy**: $150 towards device purchase

### Nutrition and Weight Management
- **Registered Dietitian Consultations**: 4 free sessions per year
- **Healthy Eating Workshops**: Monthly lunch-and-learn sessions
- **Weight Management Programs**: 12-week guided programs
- **Diabetes Prevention Program**: CDC-recognized curriculum

## Tobacco Cessation Program
- **Nicotine Replacement Therapy**: Free patches, gum, or lozenges
- **Prescription Medications**: Covered at 100%
- **Coaching Support**: Phone, app, or in-person
- **Incentive**: $500 wellness credit upon successful quit

## Maternity and Family Support

### Pregnancy and Postpartum
- **Prenatal Programs**: Education and support resources
- **Breast Pump**: Covered at 100% through medical plan
- **Lactation Consultations**: Free in-person or virtual sessions
- **Return-to-Work Support**: Gradual return options

### Adoption Assistance
- **Financial Assistance**: Up to $5,000 per adoption
- **Leave Benefits**: Same as maternity/paternity leave
- **Legal Support**: Through EAP services

## Mental Health Benefits Enhancement

### Therapy and Counseling
- **Virtual Therapy**: Unlimited sessions through app
- **In-Network Providers**: $20 copay after 3 free EAP visits
- **Specialized Programs**: LGBTQ+, BIPOC, trauma-informed care

### Mindfulness and Stress Reduction
- **Meditation App Subscription**: Free premium access
- **On-Site Meditation Room**: Quiet space for reflection
- **Stress Management Workshops**: Monthly offerings
- **Resilience Training**: Quarterly programs

## Additional Perks

### Convenience Services
- **Telemedicine**: 24/7 virtual doctor visits ($0 copay)
- **Prescription Delivery**: Free home delivery for maintenance medications
- **Vision Discount Program**: 20-40% off at national chains
- **Pet Insurance**: Discounted rates for employees
    `,
  },
];

const SAMPLE_BENEFIT_PLANS = [
  {
    id: 'ppo-standard',
    name: 'PPO Standard Plan',
    type: 'health',
    carrier: 'Blue Cross Blue Shield',
    premiums: {
      employee: 200,
      employee_spouse: 400,
      employee_children: 350,
      family: 600,
    },
    deductible: {
      individual: 1500,
      family: 3000,
    },
    outOfPocketMax: {
      individual: 4000,
      family: 8000,
    },
    coinsurance: 80,
    copays: {
      primaryCare: 30,
      specialist: 50,
      urgentCare: 75,
      emergency: 250,
    },
  },
  {
    id: 'hdhp-hsa',
    name: 'HDHP with HSA',
    type: 'health',
    carrier: 'Aetna',
    premiums: {
      employee: 100,
      employee_spouse: 200,
      employee_children: 175,
      family: 300,
    },
    deductible: {
      individual: 3000,
      family: 6000,
    },
    outOfPocketMax: {
      individual: 5000,
      family: 10000,
    },
    coinsurance: 90,
    hsaContribution: {
      individual: 1000,
      family: 2000,
    },
  },
  {
    id: 'hmo-basic',
    name: 'HMO Basic Plan',
    type: 'health',
    carrier: 'Kaiser Permanente',
    premiums: {
      employee: 150,
      employee_spouse: 300,
      employee_children: 275,
      family: 500,
    },
    deductible: {
      individual: 500,
      family: 1000,
    },
    outOfPocketMax: {
      individual: 3000,
      family: 6000,
    },
    copays: {
      primaryCare: 20,
      specialist: 40,
      urgentCare: 50,
      emergency: 150,
    },
  },
];

async function seedBenefitsData() {
  console.log('🚀 Starting benefits data seeding...\n');

  try {
    // 1. Create demo company
    console.log('📢 Creating demo company...');
    const companyRef = db.collection('companies').doc('demo-company-001');
    await companyRef.set({
      id: 'demo-company-001',
      name: 'Acme Corporation',
      industry: 'Technology',
      size: '500-1000',
      location: 'San Francisco, CA',
      benefits: {
        health: true,
        dental: true,
        vision: true,
        life: true,
        disability: true,
        retirement: true,
        hsa: true,
        fsa: true,
      },
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log('✅ Demo company created\n');

    // 2. Create benefit plans
    console.log('📋 Creating benefit plans...');
    for (const plan of SAMPLE_BENEFIT_PLANS) {
      await db
        .collection('companies')
        .doc('demo-company-001')
        .collection('benefitPlans')
        .doc(plan.id)
        .set({
          ...plan,
          active: true,
          effectiveDate: new Date('2024-01-01'),
          createdAt: FieldValue.serverTimestamp(),
        });
      console.log(`  ✓ Created plan: ${plan.name}`);
    }
    console.log('✅ Benefit plans created\n');

    // 3. Process and store documents for RAG
    console.log('📄 Processing documents for RAG...');
    for (const doc of SAMPLE_BENEFITS_DOCUMENTS) {
      const docRef = await db.collection('documents').add({
        companyId: 'demo-company-001',
        title: doc.title,
        type: doc.type,
        content: doc.content,
        uploadedAt: FieldValue.serverTimestamp(),
        uploadedBy: 'system',
        status: 'processing',
      });

      console.log(`  📝 Processing: ${doc.title}`);

      // Process document for RAG
      await ragSystem.processDocument(
        docRef.id,
        'demo-company-001',
        doc.content,
        {
          title: doc.title,
          documentType: doc.type,
          uploadedAt: new Date(),
        },
      );

      // Update document status
      await docRef.update({
        status: 'processed',
        processedAt: FieldValue.serverTimestamp(),
      });

      console.log(`  ✓ Processed: ${doc.title}`);
    }
    console.log('✅ Documents processed for RAG\n');

    // 4. Create sample employee profiles
    console.log('👥 Creating sample employee profiles...');
    const employees = [
      {
        id: 'emp-001',
        name: 'John Doe',
        email: 'john.doe@acme.com',
        department: 'Engineering',
        hireDate: new Date('2023-06-15'),
        benefitSelections: {
          health: 'ppo-standard',
          dental: true,
          vision: true,
          life: '2x',
          retirement: { contribution: 6 },
        },
      },
      {
        id: 'emp-002',
        name: 'Jane Smith',
        email: 'jane.smith@acme.com',
        department: 'Marketing',
        hireDate: new Date('2024-01-10'),
        benefitSelections: {
          health: 'hdhp-hsa',
          dental: true,
          vision: false,
          life: '1x',
          retirement: { contribution: 10 },
        },
      },
    ];

    for (const emp of employees) {
      await db
        .collection('companies')
        .doc('demo-company-001')
        .collection('employees')
        .doc(emp.id)
        .set({
          ...emp,
          active: true,
          createdAt: FieldValue.serverTimestamp(),
        });
      console.log(`  ✓ Created employee: ${emp.name}`);
    }
    console.log('✅ Sample employees created\n');

    // 5. Create sample FAQ entries
    console.log('❓ Creating FAQ entries...');
    const faqs = [
      {
        question: 'When is open enrollment?',
        answer:
          "Open enrollment typically runs from November 1-30 each year. You'll receive email reminders starting in October.",
        category: 'enrollment',
      },
      {
        question: 'Can I change my benefits mid-year?',
        answer:
          'You can only change benefits mid-year if you experience a qualifying life event such as marriage, divorce, birth/adoption, or loss of other coverage.',
        category: 'enrollment',
      },
      {
        question: 'What is the difference between PPO and HMO?',
        answer:
          'PPO plans offer more flexibility to see any provider but cost more. HMO plans require you to stay in-network and get referrals but have lower costs.',
        category: 'health',
      },
      {
        question: 'How much can I contribute to my HSA?',
        answer:
          "For 2024, you can contribute up to $4,150 for individual coverage or $8,300 for family coverage. If you're 55+, you can contribute an additional $1,000.",
        category: 'hsa',
      },
    ];

    for (const faq of faqs) {
      await db.collection('faqs').add({
        ...faq,
        companyId: 'demo-company-001',
        helpful: 0,
        notHelpful: 0,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    console.log('✅ FAQ entries created\n');

    // 6. Create analytics data
    console.log('📊 Creating analytics data...');
    await db
      .collection('analytics')
      .doc('demo-company-001')
      .set({
        companyId: 'demo-company-001',
        metrics: {
          totalEmployees: 523,
          enrolledEmployees: 498,
          averageAge: 34,
          planDistribution: {
            'ppo-standard': 245,
            'hdhp-hsa': 178,
            'hmo-basic': 75,
          },
          monthlyPremiumCost: 285000,
          employerContribution: 199500,
          employeeContribution: 85500,
        },
        trends: {
          enrollmentRate: 95.2,
          hsaAdoption: 34.1,
          preventiveCareUtilization: 67.8,
        },
        lastUpdated: FieldValue.serverTimestamp(),
      });
    console.log('✅ Analytics data created\n');

    console.log('🎉 Benefits data seeding completed successfully!');
    console.log('\n📌 Summary:');
    console.log('  - 1 Demo company');
    console.log('  - 3 Health benefit plans');
    console.log(
      `  - ${SAMPLE_BENEFITS_DOCUMENTS.length} Documents processed for RAG`,
    );
    console.log('  - 2 Sample employees');
    console.log('  - 4 FAQ entries');
    console.log('  - Analytics dashboard data');
  } catch (error) {
    console.error('❌ Error seeding benefits data:', error);
    process.exit(1);
  }
}

// Run the seeding script
seedBenefitsData()
  .then(() => {
    console.log('\n✨ All done! The benefits chatbot is ready to use.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
