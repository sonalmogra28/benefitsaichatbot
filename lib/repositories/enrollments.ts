import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { Sql } from 'postgres';
import { benefitEnrollments } from '@/lib/db/schema-v2';
import { eq } from 'drizzle-orm';
import { benefitEnrollmentSchema, BenefitEnrollmentInput } from '@/lib/validation/schemas';
import { handleError } from '@/lib/utils/error-handler';

export class EnrollmentsRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(private client: Sql) {
    this.db = drizzle(client, { schema: { benefitEnrollments } });
  }

  async create(input: BenefitEnrollmentInput) {
    try {
      const data = benefitEnrollmentSchema.parse(input);
      // Remove timestamp fields that are auto-generated
      const { createdAt, updatedAt, ...insertData } = data;
      const [row] = await this.db.insert(benefitEnrollments).values(insertData).returning();
      return row;
    } catch (err) {
      const errorResult = handleError(err);
      throw new Error(`EnrollmentsRepository.create: ${errorResult.message}`);
    }
  }

  async findByUser(userId: string) {
    return this.db
      .select()
      .from(benefitEnrollments)
      .where(eq(benefitEnrollments.userId, userId));
  }

  async terminate(id: string, endDate: string) {
    try {
      const [row] = await this.db
        .update(benefitEnrollments)
        .set({ status: 'terminated', endDate, updatedAt: new Date() })
        .where(eq(benefitEnrollments.id, id))
        .returning();
      return row;
    } catch (err) {
      const errorResult = handleError(err);
      throw new Error(`EnrollmentsRepository.terminate: ${errorResult.message}`);
    }
  }
}
