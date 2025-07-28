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
      const [user] = await this.db.insert(users).values(data).returning();
      return user;
    } catch (err) {
      handleError(err, 'UsersRepository.create');
      throw err;
    }
  }

  async findByEmail(companyId: string, email: string) {
    try {
      return this.db.query.users.findFirst({
        where: and(eq(users.companyId, companyId), eq(users.email, email)),
      });
    } catch (err) {
      handleError(err, 'UsersRepository.findByEmail');
      throw err;
    }
  }
}
