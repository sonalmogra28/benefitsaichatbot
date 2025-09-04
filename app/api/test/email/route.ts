import { type NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/services/email.service.server'; // Import singleton instance
import { requireSuperAdmin } from '@/lib/auth/admin-middleware';

// POST /api/test/email - Send a test email
export const POST = requireSuperAdmin(async (request: NextRequest) => {
  try {
    const { to, subject, text } = await request.json();

    if (!to || !subject || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, text' },
        { status: 400 },
      );
    }

    // Use sendNotification as sendEmail does not exist on EmailService
    // We will map 'to' to 'email', 'subject' to 'title', and 'text' to 'message'
    // A placeholder name will be used as it's not provided in the test route input.
    const result = await emailService.sendNotification({
      email: to,
      name: 'Test User', // Placeholder name
      title: subject,
      message: `<p>${text}</p>`,
    });

    if (result.success) {
      return NextResponse.json({ message: 'Test email sent successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to send test email', details: result.error },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 },
    );
  }
});
