// lib/services/google-workspace.service.ts
import { google } from 'googleapis';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function syncGoogleWorkspaceUsers(companyId: string, tokens: any) {
  oauth2Client.setCredentials(tokens);
  const admin = google.admin({ version: 'directory_v1', auth: oauth2Client });
  const { data } = await admin.users.list({
    customer: 'my_customer',
    maxResults: 500,
  });

  if (data.users) {
    for (const googleUser of data.users) {
      if (googleUser.primaryEmail) {
        await db
          .insert(users)
          .values({
            companyId,
            email: googleUser.primaryEmail,
            firstName: googleUser.name?.givenName,
            lastName: googleUser.name?.familyName,
          })
          .onConflictDoUpdate({
            target: [users.email, users.companyId],
            set: {
              firstName: googleUser.name?.givenName,
              lastName: googleUser.name?.familyName,
            },
          });
      }
    }
  }
}
