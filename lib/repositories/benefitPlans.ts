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
      const [plan] = await this.db.insert(benefitPlans).values(data).returning();
      return plan;
    } catch (err) {
      handleError(err, 'BenefitsRepository.create');
      throw err;
    }
  }

  async findByCompany(companyId: string) {
    try {
      return this.db
        .select()
        .from(benefitPlans)
        .where(and(eq(benefitPlans.companyId, companyId), eq(benefitPlans.isActive, true)));
    } catch (err) {
      handleError(err, 'BenefitsRepository.findByCompany');
      throw err;
    }
  }

  async update(id: string, input: Partial<BenefitPlanInput>) {
    try {
      const data = benefitPlanSchema.partial().parse(input);
      const [plan] = await this.db
        .update(benefitPlans)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(benefitPlans.id, id))
        .returning();
      return plan;
    } catch (err) {
      handleError(err, 'BenefitsRepository.update');
      throw err;
    }
  }

  async delete(id: string) {
    try {
      await this.db.delete(benefitPlans).where(eq(benefitPlans.id, id));
    } catch (err) {
      handleError(err, 'BenefitsRepository.delete');
      throw err;
    }
  }
}
