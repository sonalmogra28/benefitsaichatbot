import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { Sql } from 'postgres';
import { benefitPlans } from '@/lib/db/schema-v2';
import { eq, and } from 'drizzle-orm';
import { benefitPlanSchema, BenefitPlanInput } from '@/lib/validation/schemas';
import { handleError } from '@/lib/utils/error-handler';

export class BenefitsRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(private client: Sql) {
    this.db = drizzle(client, { schema: { benefitPlans } });
  }

  async create(input: BenefitPlanInput) {
    try {
      const data = benefitPlanSchema.parse(input);
      // Remove timestamp fields that are auto-generated
      const { createdAt, updatedAt, ...insertData } = data;
      const [plan] = await this.db.insert(benefitPlans).values(insertData).returning();
      return plan;
    } catch (err) {
      const errorResult = handleError(err);
      throw new Error(`BenefitsRepository.create: ${errorResult.message}`);
    }
  }

  async findByCompany(companyId: string) {
    try {
      return this.db
        .select()
        .from(benefitPlans)
        .where(and(eq(benefitPlans.companyId, companyId), eq(benefitPlans.isActive, true)));
    } catch (err) {
      const errorResult = handleError(err);
      throw new Error(`BenefitsRepository.findByCompany: ${errorResult.message}`);
    }
  }

  async update(id: string, input: Partial<BenefitPlanInput>) {
    try {
      const validatedData = benefitPlanSchema.partial().parse(input);
      // Remove timestamp fields
      const { createdAt, updatedAt, ...updateData } = validatedData;
      const [plan] = await this.db
        .update(benefitPlans)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(benefitPlans.id, id))
        .returning();
      return plan;
    } catch (err) {
      const errorResult = handleError(err);
      throw new Error(`BenefitsRepository.update: ${errorResult.message}`);
    }
  }

  async delete(id: string) {
    try {
      await this.db.delete(benefitPlans).where(eq(benefitPlans.id, id));
    } catch (err) {
      const errorResult = handleError(err);
      throw new Error(`BenefitsRepository.delete: ${errorResult.message}`);
    }
  }
}
