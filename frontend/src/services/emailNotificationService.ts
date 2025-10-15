/**
 * Email Notification Service
 * Feature: 009-voglio-implementare-la (Thumbnail Generation)
 * Purpose: Send email notifications for thumbnail generation failures using Resend
 */

import { Resend } from 'resend';
import { render } from '@react-email/render';
import ThumbnailFailureEmail, {
  type ThumbnailFailureEmailProps,
} from '@/emails/thumbnail-failure-notification';
import { createClient } from '@/lib/supabase/server';

/**
 * Lazy initialization for Resend client
 * Prevents build-time errors when RESEND_API_KEY is not available
 */
let resendInstance: Resend | null = null;

function getResendClient(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required for email notifications');
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export interface FailureNotificationContext {
  tenantId: string;
  eventId: string;
  failureCount: number;
}

/**
 * Send thumbnail failure notification email to tenant admins
 * Triggered after 3+ consecutive failures within 24 hours
 *
 * @param context - Failure context with tenant, event, and failure count
 * @returns Email send result
 *
 * @example
 * ```ts
 * const failureCount = await getConsecutiveFailureCount(eventId);
 * if (failureCount >= 3) {
 *   await sendThumbnailFailureNotification({
 *     tenantId,
 *     eventId,
 *     failureCount
 *   });
 * }
 * ```
 */
export async function sendThumbnailFailureNotification(
  context: FailureNotificationContext
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { tenantId, eventId, failureCount } = context;

  try {
    // Step 1: Get tenant details
    const supabase = await createClient();
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, subdomain')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // Step 2: Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('name')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error(`Event ${eventId} not found`);
    }

    // Step 3: Get admin emails for tenant
    const { data: admins, error: adminsError } = await supabase
      .from('admins')
      .select('email')
      .eq('tenant_id', tenantId);

    if (adminsError || !admins || admins.length === 0) {
      throw new Error(`No admins found for tenant ${tenantId}`);
    }

    const adminEmails = admins.map((admin) => admin.email);

    // Step 4: Get recent failure details
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: failures, error: failuresError } = await supabase
      .from('thumbnail_failure_log')
      .select(
        `
        error_message,
        slide_id,
        slides!inner (
          filename
        )
      `
      )
      .eq('event_id', eventId)
      .gte('occurred_at', oneDayAgo.toISOString())
      .order('occurred_at', { ascending: false })
      .limit(10); // Show up to 10 most recent failures

    if (failuresError) {
      console.error('Failed to fetch failure details:', failuresError);
      // Continue with empty failures array
    }

    const failedSlides = (failures || []).map((f: any) => ({
      filename: f.slides.filename,
      errorMessage: f.error_message,
    }));

    // Step 5: Prepare email data
    const dashboardUrl = `${process.env.NEXT_PUBLIC_API_URL}/admin/dashboard`;
    const fromEmail =
      process.env.NOTIFICATION_FROM_EMAIL || 'notifications@sharehub.app';
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@sharehub.app';

    const emailProps: ThumbnailFailureEmailProps = {
      tenantName: tenant.name,
      eventName: event.name,
      failureCount,
      failedSlides,
      dashboardUrl,
      supportEmail,
    };

    // Step 6: Render React Email template to HTML
    const emailHtml = render(ThumbnailFailureEmail(emailProps));

    // Step 7: Send email via Resend
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: `shareHub <${fromEmail}>`,
      to: adminEmails,
      subject: `⚠️ Thumbnail Generation Issues - ${event.name}`,
      html: emailHtml,
      tags: [
        { name: 'category', value: 'thumbnail-failure' },
        { name: 'tenant_id', value: tenantId },
        { name: 'event_id', value: eventId },
      ],
    });

    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }

    console.log(`Thumbnail failure notification sent to ${adminEmails.length} admins`, {
      messageId: data?.id,
      tenantId,
      eventId,
      failureCount,
    });

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    console.error('Failed to send thumbnail failure notification:', {
      error: errorMessage,
      context,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if notification should be sent for an event
 * Prevents spam by checking:
 * - Failure count >= 3
 * - No notification sent in last 24 hours
 *
 * @param eventId - Event UUID
 * @returns True if notification should be sent
 */
export async function shouldSendFailureNotification(
  eventId: string
): Promise<boolean> {
  const supabase = await createClient();

  // Check failure count in last 24 hours
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const { data: failures, error } = await supabase
    .from('thumbnail_failure_log')
    .select('id')
    .eq('event_id', eventId)
    .gte('occurred_at', oneDayAgo.toISOString());

  if (error) {
    console.error('Failed to check failure count:', error);
    return false;
  }

  const failureCount = failures?.length || 0;

  // Only send if >= 3 failures
  if (failureCount < 3) {
    return false;
  }

  // TODO: Add check for last notification timestamp
  // For now, allow notification on every 3rd failure
  // In production, track notification timestamps to prevent spam

  return true;
}

/**
 * Send test email notification (for development/testing)
 * @param recipientEmail - Email address to send test to
 */
export async function sendTestNotification(
  recipientEmail: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const fromEmail =
      process.env.NOTIFICATION_FROM_EMAIL || 'notifications@sharehub.app';

    const emailProps: ThumbnailFailureEmailProps = {
      tenantName: 'Test Organization',
      eventName: 'Test Event 2025',
      failureCount: 5,
      failedSlides: [
        {
          filename: 'presentation-1.pptx',
          errorMessage: 'CloudConvert API timeout after 5 minutes',
        },
        {
          filename: 'slides-deck.pdf',
          errorMessage: 'File corrupted or incomplete',
        },
        {
          filename: 'keynote-export.pptx',
          errorMessage: 'Password-protected file cannot be processed',
        },
      ],
      dashboardUrl: 'https://sharehub.app/admin/dashboard',
      supportEmail: 'support@sharehub.app',
    };

    const emailHtml = render(ThumbnailFailureEmail(emailProps));

    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: `shareHub <${fromEmail}>`,
      to: recipientEmail,
      subject: '[TEST] Thumbnail Generation Issues - Test Event 2025',
      html: emailHtml,
      tags: [{ name: 'category', value: 'test-email' }],
    });

    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get email sending statistics
 * @returns Email stats from Resend (if available)
 */
export async function getEmailStats(): Promise<{
  sent: number;
  delivered: number;
  bounced: number;
}> {
  try {
    // Resend API doesn't provide aggregate stats endpoint yet
    // This would require querying individual email statuses
    // For now, return placeholder
    return {
      sent: 0,
      delivered: 0,
      bounced: 0,
    };
  } catch (error) {
    console.error('Failed to get email stats:', error);
    return {
      sent: 0,
      delivered: 0,
      bounced: 0,
    };
  }
}
