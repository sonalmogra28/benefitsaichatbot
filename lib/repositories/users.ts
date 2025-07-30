import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { Sql } from 'postgres';
import { users } from '@/lib/db/schema-v2';
import { eq, and } from 'drizzle-orm';
import { userSchema, UserInput } from '@/lib/validation/schemas';
import { handleError } from '@/lib/utils/error-handler';

export class UsersRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(private client: Sql) {
    this.db = drizzle(client, { schema: { users } });
  }

  async create(input: UserInput) {
    try {
      const data = userSchema.parse(input);
      // Remove timestamp fields that are auto-generated
      const { createdAt, updatedAt, ...insertData } = data;
      const [user] = await this.db.insert(users).values(insertData).returning();
      return user;
    } catch (err) {
      const errorResult = handleError(err);
      throw new Error(`UsersRepository.create: ${errorResult.message}`);
    }
  }

  async findByEmail(companyId: string, email: string) {
    try {
      const [user] = await this.db
        .select()
        .from(users)
        .where(and(eq(users.companyId, companyId), eq(users.email, email)))
        .limit(1);
      return user;
    } catch (err) {
      const errorResult = handleError(err);
      throw new Error(`UsersRepository.findByEmail: ${errorResult.message}`);
    }
  }
}
