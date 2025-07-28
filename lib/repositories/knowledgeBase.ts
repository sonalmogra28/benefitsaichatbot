import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { Sql } from 'postgres';
import { knowledgeBaseDocuments } from '@/lib/db/schema-v2';
import { eq } from 'drizzle-orm';
import { knowledgeBaseDocumentSchema, KnowledgeBaseDocumentInput } from '@/lib/validation/schemas';
import { handleError } from '@/lib/utils/error-handler';

export class KnowledgeBaseRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(private client: Sql) {
    this.db = drizzle(client, { schema: { knowledgeBaseDocuments } });
  }

  async create(input: KnowledgeBaseDocumentInput) {
    const data = knowledgeBaseDocumentSchema.parse(input);
    const [doc] = await this.db.insert(knowledgeBaseDocuments).values(data).returning();
    return doc;
  }

  async listByCompany(companyId: string) {
    return this.db
      .select()
      .from(knowledgeBaseDocuments)
      .where(eq(knowledgeBaseDocuments.companyId, companyId));
  }

  async update(id: string, input: Partial<KnowledgeBaseDocumentInput>) {
    try {
      const data = knowledgeBaseDocumentSchema.partial().parse(input);
      const [doc] = await this.db
        .update(knowledgeBaseDocuments)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(knowledgeBaseDocuments.id, id))
        .returning();
      return doc;
    } catch (err) {
      handleError(err, 'KnowledgeBaseRepository.update');
      throw err;
    }
  }
}
