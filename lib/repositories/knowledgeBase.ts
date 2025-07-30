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
    // Remove timestamp fields that are auto-generated
    const { createdAt, updatedAt, ...insertData } = data;
    const [doc] = await this.db.insert(knowledgeBaseDocuments).values(insertData).returning();
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
      const validatedData = knowledgeBaseDocumentSchema.partial().parse(input);
      // Remove timestamp fields
      const { createdAt, updatedAt, ...updateData } = validatedData;
      const [doc] = await this.db
        .update(knowledgeBaseDocuments)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(knowledgeBaseDocuments.id, id))
        .returning();
      return doc;
    } catch (err) {
      const errorResult = handleError(err);
      throw new Error(`KnowledgeBaseRepository.update: ${errorResult.message}`);
    }
  }
}
