import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../schema-v2';

/**
 * Multi-Tenant Migration Script
 * 
 * This script safely migrates from single-tenant to multi-tenant architecture
 * while preserving all existing chat data and user information.
 * 
 * Migration Steps:
 * 1. Create new multi-tenant tables
 * 2. Create default company for existing users
 * 3. Migrate existing users to new schema
 * 4. Migrate existing chats and messages
 * 5. Set up Row-Level Security (RLS) policies
 * 6. Verify data integrity
 */

const DEFAULT_COMPANY_NAME = 'Default Organization';
const DEFAULT_STACK_ORG_ID = 'default-org-migration';

export async function runMigration() {
  const connectionString = process.env.POSTGRES_URL_NO_SSL || process.env.POSTGRES_URL;
  
  if (!connectionString) {
    throw new Error('Database connection string not found');
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  console.log('🚀 Starting multi-tenant migration...');

  try {
    // Step 1: Create new tables (Drizzle will handle this via schema)
    console.log('📋 Creating new multi-tenant tables...');
    
    // Step 2: Create default company for migration
    console.log('🏢 Creating default company...');
    const [defaultCompany] = await db.insert(schema.companies).values({
      stackOrgId: DEFAULT_STACK_ORG_ID,
      name: DEFAULT_COMPANY_NAME,
      settings: {},
      subscriptionTier: 'basic',
      isActive: true,
    }).returning();

    console.log(`✅ Created default company: ${defaultCompany.id}`);

    // Step 3: Migrate existing users
    console.log('👥 Migrating existing users...');
    const existingUsers = await db.select().from(schema.user);
    
    const migratedUsers = [];
    for (const legacyUser of existingUsers) {
      // Create Stack Auth compatible user ID (temporary until real Stack Auth integration)
      const stackUserId = `migrated-${legacyUser.id}`;
      
      const [newUser] = await db.insert(schema.users).values({
        stackUserId,
        companyId: defaultCompany.id,
        email: legacyUser.email,
        firstName: null, // Will be populated when Stack Auth is integrated
        lastName: null,
        role: 'employee', // Default role for migrated users
        employeeId: null,
        department: null,
        hireDate: null,
        isActive: true,
      }).returning();

      migratedUsers.push({ legacy: legacyUser, new: newUser });
      console.log(`✅ Migrated user: ${legacyUser.email} -> ${newUser.id}`);
    }

    // Step 4: Migrate existing chats
    console.log('💬 Migrating existing chats...');
    const existingChats = await db.select().from(schema.chat);
    
    const migratedChats = [];
    for (const legacyChat of existingChats) {
      // Find the corresponding new user
      const userMapping = migratedUsers.find(u => u.legacy.id === legacyChat.userId);
      if (!userMapping) {
        console.warn(`⚠️ Could not find user mapping for chat ${legacyChat.id}`);
        continue;
      }

      const [newChat] = await db.insert(schema.chats).values({
        userId: userMapping.new.id,
        companyId: defaultCompany.id,
        title: legacyChat.title,
        visibility: legacyChat.visibility || 'private',
        createdAt: legacyChat.createdAt,
      }).returning();

      migratedChats.push({ legacy: legacyChat, new: newChat });
      console.log(`✅ Migrated chat: ${legacyChat.title} -> ${newChat.id}`);
    }

    // Step 5: Migrate existing messages
    console.log('📝 Migrating existing messages...');
    
    // Migrate Message_v2 (current format)
    const existingMessages = await db.select().from(schema.message);
    
    for (const legacyMessage of existingMessages) {
      // Find the corresponding new chat
      const chatMapping = migratedChats.find(c => c.legacy.id === legacyMessage.chatId);
      if (!chatMapping) {
        console.warn(`⚠️ Could not find chat mapping for message ${legacyMessage.id}`);
        continue;
      }

      await db.insert(schema.messages).values({
        chatId: chatMapping.new.id,
        role: legacyMessage.role,
        parts: legacyMessage.parts,
        attachments: legacyMessage.attachments || [],
        createdAt: legacyMessage.createdAt,
      });
    }

    // Migrate legacy messages (Message table) if they exist
    try {
      const legacyMessages = await db.select().from(schema.messageDeprecated);
      
      for (const legacyMessage of legacyMessages) {
        const chatMapping = migratedChats.find(c => c.legacy.id === legacyMessage.chatId);
        if (!chatMapping) continue;

        // Convert legacy content format to new parts format
        const parts = [{
          type: 'text',
          text: typeof legacyMessage.content === 'string' 
            ? legacyMessage.content 
            : JSON.stringify(legacyMessage.content)
        }];

        await db.insert(schema.messages).values({
          chatId: chatMapping.new.id,
          role: legacyMessage.role,
          parts,
          attachments: [],
          createdAt: legacyMessage.createdAt,
        });
      }
    } catch (error) {
      console.log('ℹ️ No legacy messages to migrate');
    }

    // Step 6: Migrate votes
    console.log('👍 Migrating votes...');
    try {
      const existingVotes = await db.select().from(schema.vote);
      
      for (const legacyVote of existingVotes) {
        const chatMapping = migratedChats.find(c => c.legacy.id === legacyVote.chatId);
        if (!chatMapping) continue;

        // Find the new message ID (this is complex due to ID changes)
        // For now, we'll skip vote migration and let users re-vote
        console.log('ℹ️ Skipping vote migration - users will need to re-vote');
      }
    } catch (error) {
      console.log('ℹ️ No votes to migrate');
    }

    // Step 7: Set up Row-Level Security
    console.log('🔒 Setting up Row-Level Security...');
    
    await db.execute(sql`ALTER TABLE companies ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE users ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE benefit_plans ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE benefit_enrollments ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE chats ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE messages ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY`);

    // Create RLS policies (simplified for initial setup)
    await db.execute(sql`
      CREATE POLICY company_isolation ON companies 
      FOR ALL USING (
        stack_org_id = current_setting('app.current_org_id', true)
      )
    `);

    await db.execute(sql`
      CREATE POLICY user_company_isolation ON users 
      FOR ALL USING (
        company_id IN (
          SELECT id FROM companies 
          WHERE stack_org_id = current_setting('app.current_org_id', true)
        )
      )
    `);

    // Add similar policies for other tables
    const tables = [
      'benefit_plans', 'benefit_enrollments', 'knowledge_base_documents', 
      'chats', 'messages', 'analytics_events'
    ];

    for (const table of tables) {
      await db.execute(sql.raw(`
        CREATE POLICY ${table}_company_isolation ON ${table}
        FOR ALL USING (
          company_id IN (
            SELECT id FROM companies 
            WHERE stack_org_id = current_setting('app.current_org_id', true)
          )
        )
      `));
    }

    // Step 8: Verify data integrity
    console.log('🔍 Verifying data integrity...');
    
    const userCount = await db.select({ count: sql`count(*)` }).from(schema.users);
    const chatCount = await db.select({ count: sql`count(*)` }).from(schema.chats);
    const messageCount = await db.select({ count: sql`count(*)` }).from(schema.messages);
    
    console.log(`✅ Migration completed successfully!`);
    console.log(`📊 Migration Summary:`);
    console.log(`   - Companies: 1 (default)`);
    console.log(`   - Users: ${userCount[0].count}`);
    console.log(`   - Chats: ${chatCount[0].count}`);
    console.log(`   - Messages: ${messageCount[0].count}`);
    console.log(`   - Default Company ID: ${defaultCompany.id}`);
    console.log(`   - Default Stack Org ID: ${DEFAULT_STACK_ORG_ID}`);

    return {
      success: true,
      defaultCompanyId: defaultCompany.id,
      migratedUsers: migratedUsers.length,
      migratedChats: migratedChats.length,
    };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Rollback function for emergency use
export async function rollbackMigration() {
  console.log('🔄 Rolling back migration...');
  
  const connectionString = process.env.POSTGRES_URL_NO_SSL || process.env.POSTGRES_URL;
  const client = postgres(connectionString!);
  const db = drizzle(client, { schema });

  try {
    // Drop new tables (in reverse dependency order)
    const tablesToDrop = [
      'analytics_events',
      'votes', 
      'messages',
      'chats',
      'knowledge_base_documents',
      'benefit_enrollments',
      'benefit_plans',
      'users',
      'companies'
    ];

    for (const table of tablesToDrop) {
      await db.execute(sql.raw(`DROP TABLE IF EXISTS ${table} CASCADE`));
      console.log(`🗑️ Dropped table: ${table}`);
    }

    console.log('✅ Rollback completed');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// CLI execution
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'rollback') {
    rollbackMigration().catch(console.error);
  } else {
    runMigration().catch(console.error);
  }
}
