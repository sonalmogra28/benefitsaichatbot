import { type NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/email.service';
import { withPlatformAdmin } from '@/lib/auth/api-middleware';

const emailService = new EmailService();

// POST /api/test/email - Send a test email
export const POST = withPlatformAdmin(async (request: NextRequest) => {
  try {
    const { to, subject, text } = await request.json();

    if (!to || !subject || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, text' },
        { status: 400 }
      );
    }

    const result = await emailService.sendEmail({
      to,
      subject,
      html: `<p>${text}</p>`,
    });

    if (result.success) {
      return NextResponse.json({ message: 'Test email sent successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to send test email', details: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
});
